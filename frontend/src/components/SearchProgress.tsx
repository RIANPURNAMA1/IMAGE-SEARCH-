import type { SearchPhase } from '../types';

interface SearchProgressProps {
  phase: Exclude<SearchPhase, 'idle'>;
  progress: number;
}

const LABELS: Record<Exclude<SearchPhase, 'idle'>, string> = {
  optimizing: 'Menyiapkan gambar…',
  uploading: 'Mengunggah gambar…',
  searching: 'Mencari halaman yang memuat gambar ini di Google Lens…',
};

export function SearchProgress({ phase, progress }: SearchProgressProps) {
  const determinate = phase === 'uploading';
  return (
    <div className="space-y-3 rounded-md border border-line p-5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <p className="font-medium">{LABELS[phase]}</p>
        {determinate ? <p className="tabular-nums text-muted">{progress}%</p> : null}
      </div>
      <div
        role="progressbar"
        aria-label="Progres pencarian"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={determinate ? progress : undefined}
        aria-valuetext={determinate ? `${progress} persen` : LABELS[phase]}
        className="h-1 w-full overflow-hidden rounded-full bg-line"
      >
        {determinate ? (
          <div className="h-full bg-fg transition-[width] duration-150" style={{ width: `${progress}%` }} />
        ) : (
          <div className="h-full w-2/5 animate-indeterminate bg-fg motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-40" />
        )}
      </div>
      {phase === 'searching' ? (
        <p className="text-sm text-muted">Biasanya selesai dalam beberapa detik. Jangan tutup halaman ini.</p>
      ) : null}
    </div>
  );
}
