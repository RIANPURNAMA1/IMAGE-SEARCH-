export type MatchType = 'exact' | 'visual' | 'page';

export interface ImageSourceResult {
  id: string;
  title?: string;
  source?: string;
  domain?: string;
  link: string;
  thumbnail?: string;
  image?: string;
  snippet?: string;
  matchType: MatchType;
}

export interface RelatedSearch {
  query: string;
  link: string;
  thumbnail?: string;
}

export interface SearchMeta {
  provider: string;
  total: number;
  exactMatchCount: number;
  discarded: number;
  durationMs: number;
}

export interface SearchSuccess {
  results: ImageSourceResult[];
  related: RelatedSearch[];
  meta: SearchMeta;
}

export interface HealthStatus {
  configured: boolean;
  maxUploadBytes: number;
}

export type SearchPhase = 'idle' | 'optimizing' | 'uploading' | 'searching';

export interface UiError {
  code: string;
  message: string;
  retryable: boolean;
}
