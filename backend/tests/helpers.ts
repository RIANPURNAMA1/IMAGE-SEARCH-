/** Helper khusus test: membuat byte header gambar sintetis. Bukan data produksi. */
export const JPEG_HEAD = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
export const PNG_HEAD = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
export const WEBP_HEAD = Uint8Array.from([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

/** Buffer gambar sintetis (header valid + padding) dengan ukuran tertentu. */
export function fakeImage(head: Uint8Array, size = 64): Buffer {
  const buffer = Buffer.alloc(Math.max(size, head.length));
  buffer.set(head, 0);
  return buffer;
}
