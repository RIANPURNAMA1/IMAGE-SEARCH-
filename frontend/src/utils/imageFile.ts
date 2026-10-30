export const MAX_SELECT_BYTES = 15 * 1024 * 1024;
export const ACCEPT_ATTRIBUTE = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const KIND_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/** Validasi cepat di browser. Validasi yang menentukan tetap dilakukan backend (signature file). */
export function validateSelectedFile(file: { name: string; type: string; size: number }): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const expectedType = file.name.includes('.') ? KIND_BY_EXTENSION[extension] : undefined;
  // Ekstensi dan MIME harus cocok, sama seperti pemeriksaan di backend.
  if (!ALLOWED_TYPES.includes(file.type) || expectedType !== file.type) {
    return 'Format tidak didukung. Gunakan gambar JPG, PNG, atau WebP.';
  }
  if (file.size === 0) {
    return 'File kosong. Pilih gambar lain.';
  }
  if (file.size > MAX_SELECT_BYTES) {
    return 'Gambar terlalu besar. Ukuran maksimum yang dapat dipilih adalah 15 MB.';
  }
  return null;
}
