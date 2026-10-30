import { describe, expect, it } from 'vitest';
import { getDomain, sanitizeHttpUrl } from '../src/utils/url';

describe('sanitizeHttpUrl', () => {
  it('menerima http dan https', () => {
    expect(sanitizeHttpUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(sanitizeHttpUrl('  http://example.com  ')).toBe('http://example.com/');
  });

  it('menolak skema berbahaya, URL relatif, dan input bukan string', () => {
    expect(sanitizeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeHttpUrl('data:text/html;base64,AAAA')).toBeUndefined();
    expect(sanitizeHttpUrl('file:///etc/passwd')).toBeUndefined();
    expect(sanitizeHttpUrl('ftp://example.com/file')).toBeUndefined();
    expect(sanitizeHttpUrl('//example.com/x')).toBeUndefined();
    expect(sanitizeHttpUrl('/relative/path')).toBeUndefined();
    expect(sanitizeHttpUrl('')).toBeUndefined();
    expect(sanitizeHttpUrl(undefined)).toBeUndefined();
    expect(sanitizeHttpUrl(42)).toBeUndefined();
    expect(sanitizeHttpUrl(null)).toBeUndefined();
  });

  it('menolak URL dengan kredensial dan URL terlalu panjang', () => {
    expect(sanitizeHttpUrl('https://user:pass@example.com/')).toBeUndefined();
    expect(sanitizeHttpUrl(`https://example.com/${'a'.repeat(3000)}`)).toBeUndefined();
  });
});

describe('getDomain', () => {
  it('mengambil hostname tanpa www', () => {
    expect(getDomain('https://www.example.com/path')).toBe('example.com');
    expect(getDomain('https://id.wikipedia.org/wiki/X')).toBe('id.wikipedia.org');
  });

  it('mengembalikan undefined untuk input tidak valid', () => {
    expect(getDomain(undefined)).toBeUndefined();
    expect(getDomain('bukan url')).toBeUndefined();
  });
});
