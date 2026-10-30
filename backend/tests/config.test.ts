import { describe, expect, it } from 'vitest';
import { PROVIDER_MAX_UPLOAD_BYTES, parseConfig } from '../src/config';

describe('parseConfig', () => {
  it('memakai default aman bila env kosong', () => {
    const config = parseConfig({});
    expect(config.port).toBe(3001);
    expect(config.clientOrigins).toEqual(['http://localhost:5173']);
    expect(config.serpapiApiKey).toBeUndefined();
    expect(config.maxUploadBytes).toBe(PROVIDER_MAX_UPLOAD_BYTES);
  });

  it('menganggap key kosong atau placeholder sebagai belum dikonfigurasi', () => {
    expect(parseConfig({ SERPAPI_API_KEY: '   ' }).serpapiApiKey).toBeUndefined();
    expect(parseConfig({ SERPAPI_API_KEY: 'your_serpapi_key_here' }).serpapiApiKey).toBeUndefined();
    expect(parseConfig({ SERPAPI_API_KEY: ' test-key-abc ' }).serpapiApiKey).toBe('test-key-abc');
  });

  it('membatasi MAX_UPLOAD_MB sampai batas provider', () => {
    expect(parseConfig({ MAX_UPLOAD_MB: '10' }).maxUploadBytes).toBe(PROVIDER_MAX_UPLOAD_BYTES);
    expect(parseConfig({ MAX_UPLOAD_MB: '0.1' }).maxUploadBytes).toBe(Math.floor(0.1 * 1024 * 1024));
    expect(parseConfig({ MAX_UPLOAD_MB: 'abc' }).maxUploadBytes).toBe(PROVIDER_MAX_UPLOAD_BYTES);
    expect(parseConfig({ MAX_UPLOAD_MB: '-3' }).maxUploadBytes).toBe(PROVIDER_MAX_UPLOAD_BYTES);
  });

  it('mem-parse port dan daftar origin', () => {
    expect(parseConfig({ PORT: '8080' }).port).toBe(8080);
    expect(parseConfig({ PORT: '99999' }).port).toBe(3001);
    expect(parseConfig({ CLIENT_ORIGIN: 'http://a.test/, https://b.test' }).clientOrigins).toEqual([
      'http://a.test',
      'https://b.test',
    ]);
  });
});
