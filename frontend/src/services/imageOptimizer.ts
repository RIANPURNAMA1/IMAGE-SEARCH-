import { ALLOWED_TYPES } from '../utils/imageFile';

export class OptimizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OptimizeError';
  }
}

/** Menghitung dimensi baru dengan sisi terpanjang <= maxSide, tanpa memperbesar gambar. */
export function fitDimensions(width: number, height: number, maxSide: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide || longest <= 0) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Urutan sisi terpanjang yang dicoba, dimulai dari ukuran asli (maks 2048 px). */
export function candidateSides(originalLongest: number): number[] {
  const steps = [2048, 1600, 1280, 1024, 800, 640, 480];
  const start = Math.min(originalLongest, 2048);
  return [start, ...steps.filter((side) => side < start)];
}

const QUALITIES = [0.88, 0.78, 0.68, 0.58];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * Image API SerpApi hanya menerima file sampai 500 KB. Gambar yang lebih besar dikecilkan
 * di browser (resize + kompresi JPEG) sebelum dikirim. File yang sudah muat dikirim apa adanya.
 */
export async function optimizeImage(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes && ALLOWED_TYPES.includes(file.type)) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new OptimizeError('Gambar tidak dapat dibaca. File mungkin rusak atau formatnya tidak didukung browser.');
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    for (const side of candidateSides(longest)) {
      const { width, height } = fitDimensions(bitmap.width, bitmap.height, side);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new OptimizeError('Browser tidak mendukung pengolahan gambar yang dibutuhkan.');

      // JPEG tidak mendukung transparansi: isi latar putih agar PNG transparan tidak menjadi hitam.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      for (const quality of QUALITIES) {
        const blob = await canvasToBlob(canvas, quality);
        if (blob && blob.size > 0 && blob.size <= maxBytes) {
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'gambar';
          return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
        }
      }
    }
  } finally {
    bitmap.close();
  }

  throw new OptimizeError('Gambar tidak dapat dikecilkan hingga batas 500 KB. Coba gunakan gambar lain atau potong lebih dulu.');
}
