import type { ImageSourceResult, RelatedSearch } from '../types';
import { getDomain, sanitizeHttpUrl } from '../utils/url';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecords = (value: unknown): UnknownRecord[] => (Array.isArray(value) ? value.filter(isRecord) : []);

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return undefined;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

function dedupeKey(link: string): string {
  const url = new URL(link);
  url.hash = '';
  return url.href;
}

export interface NormalizedLens {
  results: ImageSourceResult[];
  related: RelatedSearch[];
  discarded: number;
}

export interface NormalizeOptions {
  maxResults?: number;
  maxRelated?: number;
}

/**
 * Mengubah JSON Google Lens (SerpApi) menjadi bentuk internal yang konsisten.
 * Dipetakan dari `visual_matches`, `organic_results`, dan `related_content`.
 * Semua field dianggap opsional; entri tanpa URL http/https valid dibuang.
 */
export function normalizeLensResponse(raw: unknown, options: NormalizeOptions = {}): NormalizedLens {
  const maxResults = options.maxResults ?? 60;
  const maxRelated = options.maxRelated ?? 8;

  if (!isRecord(raw)) return { results: [], related: [], discarded: 0 };

  const byLink = new Map<string, ImageSourceResult>();
  let discarded = 0;
  let counter = 0;

  const add = (item: UnknownRecord, matchType: ImageSourceResult['matchType'], withImage: boolean) => {
    const link = sanitizeHttpUrl(item.link);
    if (!link) {
      discarded += 1;
      return;
    }

    const snippet = cleanText(item.snippet, 400);
    const key = dedupeKey(link);
    const existing = byLink.get(key);
    if (existing) {
      if (!existing.snippet && snippet) existing.snippet = snippet;
      if (!existing.thumbnail) existing.thumbnail = sanitizeHttpUrl(item.thumbnail);
      return;
    }

    counter += 1;
    const result: ImageSourceResult = {
      id: `${matchType}-${counter}`,
      link,
      matchType,
      title: cleanText(item.title, 300),
      source: cleanText(item.source, 120),
      domain: getDomain(link),
      thumbnail: sanitizeHttpUrl(item.thumbnail),
      image: withImage ? sanitizeHttpUrl(item.image) : undefined,
      snippet,
    };
    byLink.set(key, result);
  };

  for (const item of asRecords(raw.visual_matches)) {
    add(item, item.exact_matches === true ? 'exact' : 'visual', true);
  }
  for (const item of asRecords(raw.organic_results)) {
    add(item, 'page', false);
  }

  // Urutan stabil: hasil yang ditandai provider sebagai exact match lebih dulu.
  const all = [...byLink.values()];
  const ordered = [...all.filter((r) => r.matchType === 'exact'), ...all.filter((r) => r.matchType !== 'exact')];

  const related: RelatedSearch[] = [];
  for (const item of asRecords(raw.related_content)) {
    const query = cleanText(item.query, 120);
    const link = sanitizeHttpUrl(item.link);
    if (!query || !link) continue;
    related.push({ query, link, thumbnail: sanitizeHttpUrl(item.thumbnail) });
    if (related.length >= maxRelated) break;
  }

  return { results: ordered.slice(0, maxResults), related, discarded };
}
