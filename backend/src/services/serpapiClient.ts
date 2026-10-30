import { AppError } from '../utils/errors';

const IMAGE_ENDPOINT = 'https://serpapi.com/image';
const SEARCH_ENDPOINT = 'https://serpapi.com/search';

/** Antarmuka yang dibutuhkan service pencarian; memudahkan pengujian dengan fake. */
export interface LensClient {
  /** Mengunggah gambar ke SerpApi Image API dan mengembalikan `image_id`. */
  uploadImage(data: Uint8Array, mimeType: string): Promise<string>;
  /** Menjalankan Google Lens API dengan `image_id` dan mengembalikan JSON mentah provider. */
  googleLens(imageId: string): Promise<unknown>;
}

export interface SafeLogger {
  warn(message: string, meta?: Record<string, unknown>): void;
}

export interface SerpApiClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  uploadTimeoutMs?: number;
  searchTimeoutMs?: number;
  logger?: SafeLogger;
}

type Stage = 'upload' | 'search';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractErrorMessage(json: unknown): string | undefined {
  if (isRecord(json) && typeof json.error === 'string' && json.error.trim()) {
    return json.error.trim();
  }
  return undefined;
}

/**
 * Memetakan error provider ke AppError dengan pesan tetap yang aman.
 * Body error mentah provider tidak pernah diteruskan ke pengguna.
 */
export function classifyProviderError(
  status: number,
  providerMessage: string | undefined,
  stage: Stage,
): AppError {
  const message = providerMessage ?? '';

  if (stage === 'upload') {
    if (/invalid image format|unsupported/i.test(message)) {
      return new AppError(415, 'UNSUPPORTED_TYPE', 'Format gambar ditolak oleh layanan pencarian. Gunakan JPG, PNG, atau WebP.');
    }
    if (/too large|file size|500 ?kb|maximum/i.test(message)) {
      return new AppError(413, 'FILE_TOO_LARGE', 'Ukuran gambar melebihi batas layanan pencarian (500 KB).');
    }
  }

  if (status === 401 || status === 403 || /invalid api key|api key.*(invalid|missing)|unauthorized/i.test(message)) {
    return new AppError(
      502,
      'PROVIDER_AUTH_FAILED',
      'API key SerpApi tidak valid atau tidak memiliki akses. Periksa SERPAPI_API_KEY di server.',
    );
  }

  if (status === 429 || /run out of searches|out of searches|rate limit|hourly|plan.*limit|exceeded/i.test(message)) {
    return new AppError(
      429,
      'PROVIDER_QUOTA_EXCEEDED',
      'Kuota atau batas permintaan SerpApi tercapai. Periksa paket SerpApi Anda atau coba lagi nanti.',
    );
  }

  if (status >= 500) {
    return new AppError(502, 'PROVIDER_UNAVAILABLE', 'Layanan pencarian sedang bermasalah. Coba lagi beberapa saat lagi.');
  }

  return new AppError(502, 'PROVIDER_ERROR', 'Layanan pencarian mengembalikan respons yang tidak dapat diproses.');
}

export class SerpApiClient implements LensClient {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly uploadTimeoutMs: number;
  private readonly searchTimeoutMs: number;
  private readonly logger?: SafeLogger;

  constructor(options: SerpApiClientOptions) {
    this.apiKey = options.apiKey;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.uploadTimeoutMs = options.uploadTimeoutMs ?? 30_000;
    this.searchTimeoutMs = options.searchTimeoutMs ?? 60_000;
    this.logger = options.logger;
  }

  async uploadImage(data: Uint8Array, mimeType: string): Promise<string> {
    const extension = EXTENSION_BY_MIME[mimeType] ?? 'jpg';
    // Salin ke buffer baru agar Blob memegang ArrayBuffer sendiri.
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);

    const form = new FormData();
    form.append('api_key', this.apiKey);
    form.append('image', new Blob([copy], { type: mimeType }), `upload.${extension}`);

    const json = await this.request(IMAGE_ENDPOINT, { method: 'POST', body: form }, this.uploadTimeoutMs, 'upload');

    const errorMessage = extractErrorMessage(json);
    if (errorMessage) throw this.fail(200, errorMessage, 'upload');

    const imageId = isRecord(json) ? json.image_id : undefined;
    if (typeof imageId !== 'string' || imageId.trim() === '') {
      throw this.fail(200, 'missing image_id', 'upload');
    }
    return imageId;
  }

  async googleLens(imageId: string): Promise<unknown> {
    // Parameter sesuai dokumentasi Google Lens API: engine, type, image_id, api_key.
    const params = new URLSearchParams({
      engine: 'google_lens',
      type: 'all',
      image_id: imageId,
      api_key: this.apiKey,
    });
    // URL mengandung API key: tidak boleh dicatat ke log.
    const json = await this.request(`${SEARCH_ENDPOINT}?${params.toString()}`, { method: 'GET' }, this.searchTimeoutMs, 'search');

    if (!isRecord(json)) throw this.fail(200, 'non-object response', 'search');

    const errorMessage = extractErrorMessage(json);
    if (errorMessage) {
      // SerpApi melaporkan pencarian tanpa hasil sebagai error teks; itu bukan kegagalan.
      if (/hasn'?t returned any results|no results/i.test(errorMessage)) return {};
      throw this.fail(200, errorMessage, 'search');
    }

    const metadata = json.search_metadata;
    if (isRecord(metadata) && metadata.status === 'Error') {
      throw this.fail(200, 'search_metadata.status=Error', 'search');
    }
    return json;
  }

  private async request(url: string, init: RequestInit, timeoutMs: number, stage: Stage): Promise<unknown> {
    let status: number;
    let ok: boolean;
    let text: string;

    try {
      const response = await this.fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      status = response.status;
      ok = response.ok;
      text = await response.text();
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        this.logger?.warn('provider request timed out', { stage });
        throw new AppError(504, 'PROVIDER_TIMEOUT', 'Layanan pencarian terlalu lama merespons. Coba lagi.');
      }
      // Pesan error jaringan tidak dicatat karena dapat memuat URL berisi API key.
      this.logger?.warn('provider request failed', { stage, errorName: name });
      throw new AppError(502, 'PROVIDER_UNAVAILABLE', 'Tidak dapat menghubungi layanan pencarian. Coba lagi beberapa saat lagi.');
    }

    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }

    if (!ok) throw this.fail(status, extractErrorMessage(json), stage);
    return json;
  }

  private fail(status: number, providerMessage: string | undefined, stage: Stage): AppError {
    const redacted = providerMessage
      ? providerMessage.split(this.apiKey).join('[redacted]').slice(0, 200)
      : undefined;
    this.logger?.warn('provider returned an error', { stage, status, providerMessage: redacted });
    return classifyProviderError(status, providerMessage, stage);
  }
}
