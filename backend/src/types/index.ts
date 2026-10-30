export type MatchType = 'exact' | 'visual' | 'page';

/** Hasil yang sudah dinormalisasi dan aman dikirim ke frontend. */
export interface ImageSourceResult {
  id: string;
  title?: string;
  source?: string;
  domain?: string;
  /** URL halaman sumber (selalu http/https yang valid). */
  link: string;
  thumbnail?: string;
  image?: string;
  snippet?: string;
  /**
   * exact  = provider menandai `exact_matches: true`
   * visual = entri `visual_matches` tanpa penanda exact
   * page   = entri `organic_results` (halaman terkait)
   */
  matchType: MatchType;
}

export interface RelatedSearch {
  query: string;
  link: string;
  thumbnail?: string;
}

export interface SearchMeta {
  provider: 'SerpApi Google Lens';
  total: number;
  exactMatchCount: number;
  /** Entri provider yang dibuang karena tidak punya URL http/https valid. */
  discarded: number;
  durationMs: number;
}

export interface SearchSuccessBody {
  success: true;
  results: ImageSourceResult[];
  related: RelatedSearch[];
  meta: SearchMeta;
}

export interface ErrorBody {
  success: false;
  error: { code: string; message: string };
}
