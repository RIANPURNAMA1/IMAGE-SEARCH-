import os from 'node:os';
import path from 'node:path';

/**
 * Batas Image API SerpApi adalah 500 KB. Dipakai nilai konservatif 500.000 byte
 * agar file di ambang batas tidak ditolak karena perbedaan definisi KB.
 */
export const PROVIDER_MAX_UPLOAD_BYTES = 500_000;

const PLACEHOLDER_KEYS = new Set(['', 'your_serpapi_key_here', 'changeme', 'isi_api_key_anda']);

export interface AppConfig {
  port: number;
  clientOrigins: string[];
  serpapiApiKey: string | undefined;
  maxUploadBytes: number;
  uploadTimeoutMs: number;
  searchTimeoutMs: number;
  tempDir: string;
}

function parsePort(value: string | undefined): number {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : 3001;
}

function parseMaxUploadBytes(value: string | undefined): number {
  const mb = Number.parseFloat(value ?? '');
  if (!Number.isFinite(mb) || mb <= 0) return PROVIDER_MAX_UPLOAD_BYTES;
  return Math.min(Math.floor(mb * 1024 * 1024), PROVIDER_MAX_UPLOAD_BYTES);
}

function parseOrigins(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return origins.length > 0 ? origins : ['http://localhost:5173'];
}

export function parseConfig(env: NodeJS.ProcessEnv): AppConfig {
  const rawKey = env.SERPAPI_API_KEY?.trim() ?? '';
  return {
    port: parsePort(env.PORT),
    clientOrigins: parseOrigins(env.CLIENT_ORIGIN),
    serpapiApiKey: PLACEHOLDER_KEYS.has(rawKey.toLowerCase()) ? undefined : rawKey,
    maxUploadBytes: parseMaxUploadBytes(env.MAX_UPLOAD_MB),
    uploadTimeoutMs: 30_000,
    searchTimeoutMs: 60_000,
    tempDir: path.join(os.tmpdir(), 'image-source-finder'),
  };
}
