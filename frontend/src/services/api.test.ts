import { describe, expect, it } from 'vitest';
import { ApiError, parseErrorBody, parseSearchBody } from './api';

// SYNTHETIC TEST FIXTURE: bukan respons produksi.
const body = {
  success: true,
  results: [
    { id: 'exact-1', link: 'https://a.example.test/x', matchType: 'exact', title: 'A', thumbnail: 'https://t.example.test/1.jpg' },
    { id: 'visual-2', link: 'javascript:alert(1)', matchType: 'visual' },
    { id: 'page-3', link: 'https://b.example.test/', matchType: 'tidak-dikenal', thumbnail: 'data:image/png;base64,AAAA', image: 'ftp://x' },
    'bukan-objek',
  ],
  related: [
    { query: 'terkait', link: 'https://l.example.test/?q=1' },
    { query: '', link: 'https://l.example.test/kosong' },
    { query: 'buruk', link: 'javascript:void(0)' },
  ],
  meta: { provider: 'SerpApi Google Lens', total: 99, exactMatchCount: 99, discarded: 2, durationMs: 1234 },
};

describe('parseSearchBody', () => {
  const parsed = parseSearchBody(body);

  it('menyaring tautan tidak aman dan menghitung ulang meta dari data yang benar-benar dirender', () => {
    expect(parsed.results.map((r) => r.link)).toEqual(['https://a.example.test/x', 'https://b.example.test/']);
    expect(parsed.meta.total).toBe(2);
    expect(parsed.meta.exactMatchCount).toBe(1);
    expect(parsed.meta.discarded).toBe(2);
  });

  it('membuang thumbnail/gambar bukan http(s) dan menormalkan matchType tak dikenal', () => {
    const second = parsed.results[1];
    expect(second.thumbnail).toBeUndefined();
    expect(second.image).toBeUndefined();
    expect(second.matchType).toBe('visual');
  });

  it('hanya menyimpan related yang valid', () => {
    expect(parsed.related).toEqual([{ query: 'terkait', link: 'https://l.example.test/?q=1', thumbnail: undefined }]);
  });

  it('melempar ApiError untuk bentuk respons yang salah', () => {
    for (const bad of [null, {}, { success: false }, { success: true }, { success: true, results: 'x' }]) {
      expect(() => parseSearchBody(bad)).toThrow(ApiError);
    }
  });
});

describe('parseErrorBody', () => {
  it('membaca format error backend', () => {
    const error = parseErrorBody({ success: false, error: { code: 'PROVIDER_QUOTA_EXCEEDED', message: 'Kuota habis.' } }, 429);
    expect(error.code).toBe('PROVIDER_QUOTA_EXCEEDED');
    expect(error.message).toBe('Kuota habis.');
    expect(error.status).toBe(429);
  });

  it('memberi fallback aman untuk body tak dikenal', () => {
    const error = parseErrorBody('<html>502</html>', 502);
    expect(error.code).toBe('UNKNOWN_ERROR');
  });
});
