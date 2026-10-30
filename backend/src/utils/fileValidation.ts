import path from 'node:path';
import { AppError } from './errors';

export type ImageKind = 'jpeg' | 'png' | 'webp';

export const ALLOWED_MIME_TYPES: Record<string, ImageKind> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const EXTENSION_KINDS: Record<string, ImageKind> = {
  '.jpg': 'jpeg',
  '.jpeg': 'jpeg',
  '.png': 'png',
  '.webp': 'webp',
};

export const MIME_BY_KIND: Record<ImageKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Jumlah byte awal yang cukup untuk mengenali signature ketiga format. */
export const SIGNATURE_BYTES = 12;

const unsupported = () =>
  new AppError(415, 'UNSUPPORTED_TYPE', 'Format file tidak didukung. Gunakan gambar JPG, PNG, atau WebP.');

export function kindFromExtension(originalName: string): ImageKind | undefined {
  return EXTENSION_KINDS[path.extname(originalName).toLowerCase()];
}

export function kindFromMime(mimeType: string): ImageKind | undefined {
  return ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
}

/** Mengenali format dari magic bytes, bukan dari nama atau MIME yang dikirim klien. */
export function detectImageKind(head: Uint8Array): ImageKind | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'jpeg';
  }
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (head.length >= 8 && pngSignature.every((byte, i) => head[i] === byte)) {
    return 'png';
  }
  if (
    head.length >= 12 &&
    String.fromCharCode(head[0], head[1], head[2], head[3]) === 'RIFF' &&
    String.fromCharCode(head[8], head[9], head[10], head[11]) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/** Dipakai oleh Multer fileFilter: cek ekstensi dan MIME sebelum file ditulis ke disk. */
export function assertDeclaredType(originalName: string, mimeType: string): void {
  const byExt = kindFromExtension(originalName);
  const byMime = kindFromMime(mimeType);
  if (!byExt || !byMime || byExt !== byMime) throw unsupported();
}

/**
 * Validasi isi file setelah tersimpan: tidak kosong dan signature cocok
 * dengan ekstensi/MIME yang dideklarasikan. Mengembalikan jenis gambar sebenarnya.
 */
export function assertImageContent(
  originalName: string,
  mimeType: string,
  size: number,
  head: Uint8Array,
): ImageKind {
  if (size <= 0) {
    throw new AppError(400, 'FILE_EMPTY', 'File gambar kosong. Pilih file lain.');
  }
  const detected = detectImageKind(head);
  const declaredByExt = kindFromExtension(originalName);
  const declaredByMime = kindFromMime(mimeType);
  if (!detected || detected !== declaredByExt || detected !== declaredByMime) {
    throw unsupported();
  }
  return detected;
}
