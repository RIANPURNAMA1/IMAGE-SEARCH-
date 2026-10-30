import { readFile } from 'node:fs/promises';
import type { ImageSourceResult, RelatedSearch, SearchMeta } from '../types';
import { normalizeLensResponse } from './normalize';
import type { LensClient } from './serpapiClient';

export interface SearchOutcome {
  results: ImageSourceResult[];
  related: RelatedSearch[];
  meta: SearchMeta;
}

export interface SearchByFileOptions {
  filePath: string;
  mimeType: string;
  client: LensClient;
  now?: () => number;
}

/**
 * Alur: baca file sementara -> upload ke Image API -> Google Lens dengan image_id
 * -> normalisasi. Tidak ada retry otomatis karena setiap request menggunakan kuota berbayar.
 * Penghapusan file sementara dilakukan oleh pemanggil di blok `finally`.
 */
export async function searchByImageFile(options: SearchByFileOptions): Promise<SearchOutcome> {
  const now = options.now ?? Date.now;
  const startedAt = now();

  const data = await readFile(options.filePath);
  const imageId = await options.client.uploadImage(data, options.mimeType);
  const raw = await options.client.googleLens(imageId);
  const { results, related, discarded } = normalizeLensResponse(raw);

  return {
    results,
    related,
    meta: {
      provider: 'SerpApi Google Lens',
      total: results.length,
      exactMatchCount: results.filter((result) => result.matchType === 'exact').length,
      discarded,
      durationMs: Math.max(0, now() - startedAt),
    },
  };
}
