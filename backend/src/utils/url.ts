const MAX_URL_LENGTH = 2048;

/**
 * Mengembalikan URL ter-normalisasi hanya jika http: atau https: dan valid.
 * Menolak javascript:, data:, file:, URL relatif, serta URL dengan kredensial.
 */
export function sanitizeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined;
  if (!parsed.hostname) return undefined;
  if (parsed.username || parsed.password) return undefined;
  return parsed.href;
}

/** Hostname tanpa awalan "www." atau undefined bila URL tidak valid. */
export function getDomain(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.replace(/^www\./i, '');
    return host || undefined;
  } catch {
    return undefined;
  }
}
