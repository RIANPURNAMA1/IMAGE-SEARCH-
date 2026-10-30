import type { HealthStatus, ImageSourceResult, MatchType, RelatedSearch, SearchSuccess } from '../types';
import { safeHttpUrl } from '../utils/url';

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 120_000;

export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined;

const MATCH_TYPES: MatchType[] = ['exact', 'visual', 'page'];

/** Memvalidasi bentuk respons backend dan menyaring URL yang tidak aman sebelum dirender. */
export function parseSearchBody(body: unknown): SearchSuccess {
  if (!isRecord(body) || body.success !== true || !Array.isArray(body.results)) {
    throw new ApiError('INVALID_RESPONSE', 'Respons server tidak dikenali.');
  }

  const results: ImageSourceResult[] = [];
  for (const raw of body.results) {
    if (!isRecord(raw)) continue;
    const link = safeHttpUrl(raw.link);
    if (!link) continue;
    const matchType = MATCH_TYPES.includes(raw.matchType as MatchType) ? (raw.matchType as MatchType) : 'visual';
    results.push({
      id: optionalString(raw.id) ?? `r-${results.length}`,
      link,
      matchType,
      title: optionalString(raw.title),
      source: optionalString(raw.source),
      domain: optionalString(raw.domain),
      thumbnail: safeHttpUrl(raw.thumbnail),
      image: safeHttpUrl(raw.image),
      snippet: optionalString(raw.snippet),
    });
  }

  const related: RelatedSearch[] = [];
  if (Array.isArray(body.related)) {
    for (const raw of body.related) {
      if (!isRecord(raw)) continue;
      const query = optionalString(raw.query);
      const link = safeHttpUrl(raw.link);
      if (query && link) related.push({ query, link, thumbnail: safeHttpUrl(raw.thumbnail) });
    }
  }

  const meta = isRecord(body.meta) ? body.meta : {};
  return {
    results,
    related,
    meta: {
      provider: optionalString(meta.provider) ?? 'SerpApi Google Lens',
      total: results.length,
      exactMatchCount: results.filter((r) => r.matchType === 'exact').length,
      discarded: typeof meta.discarded === 'number' ? meta.discarded : 0,
      durationMs: typeof meta.durationMs === 'number' ? meta.durationMs : 0,
    },
  };
}

export function parseErrorBody(body: unknown, status: number): ApiError {
  if (isRecord(body) && body.success === false && isRecord(body.error)) {
    const code = optionalString(body.error.code) ?? 'UNKNOWN_ERROR';
    const message = optionalString(body.error.message) ?? 'Terjadi kesalahan.';
    return new ApiError(code, message, status);
  }
  return new ApiError('UNKNOWN_ERROR', 'Server mengembalikan respons yang tidak dikenali.', status);
}

export async function fetchHealth(signal?: AbortSignal): Promise<HealthStatus> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/health`, { signal });
  } catch {
    throw new ApiError('NETWORK_ERROR', 'Server tidak dapat dihubungi.');
  }
  if (!response.ok) throw new ApiError('NETWORK_ERROR', 'Server tidak dapat dihubungi.', response.status);

  const body: unknown = await response.json().catch(() => undefined);
  if (!isRecord(body) || typeof body.configured !== 'boolean') {
    throw new ApiError('INVALID_RESPONSE', 'Respons server tidak dikenali.');
  }
  return {
    configured: body.configured,
    maxUploadBytes: typeof body.maxUploadBytes === 'number' ? body.maxUploadBytes : 500_000,
  };
}

export interface SearchImageOptions {
  signal?: AbortSignal;
  /** Persentase unggahan 0-100. */
  onUploadProgress?: (percent: number) => void;
  /** Dipanggil saat seluruh file selesai terkirim dan server mulai mencari. */
  onUploadComplete?: () => void;
}

/** XMLHttpRequest dipakai agar progres unggahan nyata dapat ditampilkan. */
export function searchImage(file: File, options: SearchImageOptions = {}): Promise<SearchSuccess> {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException('Dibatalkan', 'AbortError'));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/search`);
    xhr.timeout = REQUEST_TIMEOUT_MS;
    xhr.responseType = 'text';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onUploadProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    };
    xhr.upload.onload = () => options.onUploadComplete?.();

    xhr.onload = () => {
      let body: unknown;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = undefined;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(parseSearchBody(body));
        } catch (error) {
          reject(error);
        }
        return;
      }
      reject(parseErrorBody(body, xhr.status));
    };
    xhr.onerror = () =>
      reject(new ApiError('NETWORK_ERROR', 'Tidak dapat terhubung ke server. Periksa koneksi dan pastikan backend berjalan.'));
    xhr.ontimeout = () => reject(new ApiError('TIMEOUT', 'Pencarian memakan waktu terlalu lama. Coba lagi.'));
    xhr.onabort = () => reject(new DOMException('Dibatalkan', 'AbortError'));

    options.signal?.addEventListener('abort', () => xhr.abort(), { once: true });

    const form = new FormData();
    form.append('image', file, file.name);
    xhr.send(form);
  });
}
