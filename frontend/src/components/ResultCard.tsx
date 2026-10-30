import { useState } from 'react';
import type { ImageSourceResult, MatchType } from '../types';
import { btnPrimary, btnSecondary } from './ui';

const BADGES: Record<MatchType, { label: string; hint: string; className: string }> = {
  exact: {
    label: 'Cocok persis',
    hint: 'Ditandai sebagai kecocokan persis oleh penyedia pencarian',
    className: 'bg-fg text-bg',
  },
  visual: {
    label: 'Gambar serupa',
    hint: 'Kecocokan visual dari Google Lens',
    className: 'border border-line-strong text-muted',
  },
  page: {
    label: 'Sumber terkait',
    hint: 'Halaman terkait dari hasil pencarian',
    className: 'border border-line-strong text-muted',
  },
};

export function ResultCard({ result }: { result: ImageSourceResult }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const title = result.title ?? result.domain ?? 'Tanpa judul';
  const sourceName = result.source ?? result.domain;
  const badge = BADGES[result.matchType];

  return (
    <li>
      <article className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-bg">
        <div className="relative aspect-[4/3] bg-surface">
          {result.thumbnail && !thumbnailFailed ? (
            <img
              src={result.thumbnail}
              alt={`Thumbnail untuk ${title}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setThumbnailFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              role="img"
              aria-label="Thumbnail tidak tersedia"
              className="flex h-full w-full items-center justify-center text-sm text-muted"
            >
              Thumbnail tidak tersedia
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <span title={badge.hint} className={`rounded px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>

          <div className="space-y-1">
            <h3 className="line-clamp-2 text-[15px] font-medium leading-snug">{title}</h3>
            {sourceName ? <p className="truncate text-sm text-muted">{sourceName}</p> : null}
            {result.snippet ? <p className="line-clamp-2 pt-1 text-sm text-muted">{result.snippet}</p> : null}
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            <a href={result.link} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
              Buka sumber<span className="sr-only"> untuk {title} (tab baru)</span>
            </a>
            {result.image ? (
              <a href={result.image} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                Lihat gambar<span className="sr-only"> dari {title} (tab baru)</span>
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </li>
  );
}
