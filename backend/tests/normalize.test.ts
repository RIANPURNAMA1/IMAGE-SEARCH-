import { describe, expect, it } from 'vitest';
import { normalizeLensResponse } from '../src/services/normalize';
import { SYNTHETIC_LENS_RESPONSE } from './fixtures';

describe('normalizeLensResponse (fixture sintetis)', () => {
  const normalized = normalizeLensResponse(SYNTHETIC_LENS_RESPONSE);

  it('menandai exact hanya bila provider mengirim exact_matches: true, dan menaruhnya di depan', () => {
    expect(normalized.results[0].matchType).toBe('exact');
    expect(normalized.results[0].link).toBe('https://exact.example.test/foto');
    const visual = normalized.results.find((r) => r.link.startsWith('https://www.example.test/page-1'));
    expect(visual?.matchType).toBe('visual');
  });

  it('membuang entri tanpa URL http/https valid dan menghitungnya', () => {
    const links = normalized.results.map((r) => r.link);
    expect(links.some((link) => link.startsWith('javascript:'))).toBe(false);
    // javascript: + tanpa link = 2 entri dibuang; entri bukan-objek diabaikan.
    expect(normalized.discarded).toBe(2);
  });

  it('menggabungkan duplikat berdasarkan URL tanpa hash dan mengambil snippet yang hilang', () => {
    const matches = normalized.results.filter((r) => r.link.startsWith('https://www.example.test/page-1'));
    expect(matches).toHaveLength(1);
    expect(matches[0].snippet).toBe('Cuplikan dari hasil organik.');
  });

  it('merapikan spasi, mengisi domain, dan tidak mengarang field yang tidak ada', () => {
    const first = normalized.results.find((r) => r.link.startsWith('https://www.example.test/page-1'));
    expect(first?.title).toBe('Contoh Halaman Satu');
    expect(first?.domain).toBe('example.test');
    const noThumb = normalized.results.find((r) => r.link === 'https://notn.example.test/x');
    expect(noThumb?.thumbnail).toBeUndefined();
    expect(noThumb?.image).toBeUndefined();
    expect(noThumb?.source).toBeUndefined();
    expect(Object.keys(noThumb ?? {})).not.toContain('score');
  });

  it('memetakan organic_results sebagai "page" dan menolak thumbnail data: URI', () => {
    const organic = normalized.results.find((r) => r.link === 'http://organic.example.test/artikel');
    expect(organic?.matchType).toBe('page');
    expect(organic?.thumbnail).toBeUndefined();
    expect(organic?.snippet).toBe('Cuplikan panjang');
  });

  it('hanya menyimpan related_content dengan query dan link valid', () => {
    expect(normalized.related).toEqual([
      {
        query: 'kata kunci terkait',
        link: 'https://lens.example.test/search?q=1',
        thumbnail: 'https://thumbs.example.test/r1.jpg',
      },
    ]);
  });
});

describe('normalizeLensResponse (kasus tepi)', () => {
  it('mengembalikan hasil kosong untuk input bukan objek, null, atau objek kosong', () => {
    for (const input of [undefined, null, 'teks', 42, [], {}]) {
      const out = normalizeLensResponse(input);
      expect(out.results).toEqual([]);
      expect(out.related).toEqual([]);
      expect(out.discarded).toBe(0);
    }
  });

  it('toleran terhadap field bertipe salah atau array kosong', () => {
    const out = normalizeLensResponse({ visual_matches: 'x', organic_results: {}, related_content: [] });
    expect(out.results).toEqual([]);
  });

  it('membatasi jumlah hasil sesuai maxResults', () => {
    const visual_matches = Array.from({ length: 10 }, (_, i) => ({ title: `T${i}`, link: `https://s${i}.example.test/` }));
    expect(normalizeLensResponse({ visual_matches }, { maxResults: 3 }).results).toHaveLength(3);
  });

  it('memotong teks yang sangat panjang', () => {
    const out = normalizeLensResponse({ visual_matches: [{ title: 'a'.repeat(1000), link: 'https://x.example.test/' }] });
    expect(out.results[0].title?.length).toBeLessThanOrEqual(300);
  });
});
