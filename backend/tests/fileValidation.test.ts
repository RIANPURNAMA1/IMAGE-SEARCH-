import { describe, expect, it } from 'vitest';
import {
  assertDeclaredType,
  assertImageContent,
  detectImageKind,
} from '../src/utils/fileValidation';
import { AppError } from '../src/utils/errors';
import { JPEG_HEAD, PNG_HEAD, WEBP_HEAD } from './helpers';

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof AppError ? error.code : 'OTHER';
  }
  return undefined;
}

describe('detectImageKind', () => {
  it('mengenali JPEG, PNG, dan WebP dari signature', () => {
    expect(detectImageKind(JPEG_HEAD)).toBe('jpeg');
    expect(detectImageKind(PNG_HEAD)).toBe('png');
    expect(detectImageKind(WEBP_HEAD)).toBe('webp');
  });

  it('menolak teks, RIFF non-WebP, dan data terlalu pendek', () => {
    expect(detectImageKind(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBeNull();
    const wav = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45]);
    expect(detectImageKind(wav)).toBeNull();
    expect(detectImageKind(Uint8Array.from([0xff, 0xd8]))).toBeNull();
    expect(detectImageKind(new Uint8Array(0))).toBeNull();
  });
});

describe('assertDeclaredType', () => {
  it('menerima kombinasi ekstensi dan MIME yang cocok', () => {
    expect(codeOf(() => assertDeclaredType('foto.jpg', 'image/jpeg'))).toBeUndefined();
    expect(codeOf(() => assertDeclaredType('foto.JPEG', 'image/jpeg'))).toBeUndefined();
    expect(codeOf(() => assertDeclaredType('a.png', 'image/png'))).toBeUndefined();
    expect(codeOf(() => assertDeclaredType('a.webp', 'image/webp'))).toBeUndefined();
  });

  it('menolak ekstensi, MIME, atau kombinasi yang tidak cocok', () => {
    expect(codeOf(() => assertDeclaredType('a.gif', 'image/gif'))).toBe('UNSUPPORTED_TYPE');
    expect(codeOf(() => assertDeclaredType('a.svg', 'image/svg+xml'))).toBe('UNSUPPORTED_TYPE');
    expect(codeOf(() => assertDeclaredType('a.png', 'image/jpeg'))).toBe('UNSUPPORTED_TYPE');
    expect(codeOf(() => assertDeclaredType('a.exe', 'image/png'))).toBe('UNSUPPORTED_TYPE');
    expect(codeOf(() => assertDeclaredType('noext', 'image/png'))).toBe('UNSUPPORTED_TYPE');
  });
});

describe('assertImageContent', () => {
  it('mengembalikan jenis gambar bila isi cocok dengan deklarasi', () => {
    expect(assertImageContent('a.jpg', 'image/jpeg', 100, JPEG_HEAD)).toBe('jpeg');
    expect(assertImageContent('a.png', 'image/png', 100, PNG_HEAD)).toBe('png');
    expect(assertImageContent('a.webp', 'image/webp', 100, WEBP_HEAD)).toBe('webp');
  });

  it('menolak file kosong dengan FILE_EMPTY', () => {
    expect(codeOf(() => assertImageContent('a.png', 'image/png', 0, new Uint8Array(0)))).toBe('FILE_EMPTY');
  });

  it('menolak file yang namanya gambar tetapi isinya bukan', () => {
    expect(codeOf(() => assertImageContent('a.png', 'image/png', 20, Buffer.from('MZ-not-an-image')))).toBe(
      'UNSUPPORTED_TYPE',
    );
  });

  it('menolak bila signature berbeda dari ekstensi/MIME', () => {
    expect(codeOf(() => assertImageContent('a.png', 'image/png', 100, JPEG_HEAD))).toBe('UNSUPPORTED_TYPE');
  });
});
