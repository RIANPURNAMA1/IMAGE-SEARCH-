import type { SearchSuccess } from '../types';
import { btnSecondary } from './ui';
import { ResultCard } from './ResultCard';

interface ResultsSectionProps {
  outcome: SearchSuccess;
  onReset: () => void;
}

export function ResultsSection({ outcome, onReset }: ResultsSectionProps) {
  const { results, related, meta } = outcome;

  if (results.length === 0) {
    return (
      <section aria-labelledby="results-heading" className="rounded-md border border-line p-8 text-center">
        <h2 id="results-heading" className="text-xl font-bold tracking-tight">
          Tidak ada halaman yang ditemukan
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Google Lens tidak mengembalikan halaman sumber untuk gambar ini. Coba gambar dengan resolusi lebih tinggi atau
          potong ke objek utamanya, lalu cari lagi.
        </p>
        <button type="button" onClick={onReset} className={`${btnSecondary} mt-6`}>
          Gunakan gambar lain
        </button>
      </section>
    );
  }

  return (
    <section aria-labelledby="results-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 id="results-heading" className="text-2xl font-bold tracking-tight">
            Halaman sumber ditemukan
          </h2>
          <p className="mt-1 text-sm text-muted">
            {meta.total} hasil
            {meta.exactMatchCount > 0 ? `, ${meta.exactMatchCount} ditandai cocok persis oleh penyedia` : ''}.
            Hasil ini terkait dengan gambar Anda, bukan penentu sumber aslinya.
          </p>
        </div>
        <button type="button" onClick={onReset} className={btnSecondary}>
          Gunakan gambar lain
        </button>
      </div>

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {results.map((result) => (
          <ResultCard key={result.id} result={result} />
        ))}
      </ul>

      {related.length > 0 ? (
        <div className="space-y-3 border-t border-line pt-6">
          <h3 className="text-base font-bold tracking-tight">Pencarian terkait di Google Lens</h3>
          <ul className="flex flex-wrap gap-2">
            {related.map((item) => (
              <li key={item.link}>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex rounded-md border border-line-strong px-3 py-1.5 text-sm hover:bg-surface"
                >
                  {item.query}
                  <span className="sr-only"> (tab baru)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
