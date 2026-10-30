import { useCallback, useEffect, useState } from 'react';
import { ApiStatusNotice } from '../components/ApiStatusNotice';
import { ErrorNotice } from '../components/ErrorNotice';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { PreviewPanel } from '../components/PreviewPanel';
import { ResultsSection } from '../components/ResultsSection';
import { SearchProgress } from '../components/SearchProgress';
import { UploadZone } from '../components/UploadZone';
import { useImageSearch } from '../hooks/useImageSearch';
import { fetchHealth } from '../services/api';

type ApiState = 'checking' | 'ready' | 'not_configured' | 'unreachable';

const DEFAULT_MAX_BYTES = 500_000;

export default function HomePage() {
  const [api, setApi] = useState<{ state: ApiState; maxUploadBytes: number }>({
    state: 'checking',
    maxUploadBytes: DEFAULT_MAX_BYTES,
  });

  const checkApi = useCallback(async () => {
    setApi((previous) => ({ ...previous, state: 'checking' }));
    try {
      const health = await fetchHealth();
      setApi({ state: health.configured ? 'ready' : 'not_configured', maxUploadBytes: health.maxUploadBytes });
    } catch {
      setApi((previous) => ({ ...previous, state: 'unreachable' }));
    }
  }, []);

  useEffect(() => {
    void checkApi();
  }, [checkApi]);

  const search = useImageSearch(api.maxUploadBytes);
  const { file, previewUrl, phase, outcome, error, busy } = search;

  const canSearch = api.state !== 'not_configured';

  let liveMessage = '';
  if (phase === 'optimizing') liveMessage = 'Menyiapkan gambar.';
  else if (phase === 'uploading') liveMessage = 'Mengunggah gambar.';
  else if (phase === 'searching') liveMessage = 'Mencari di Google Lens.';
  else if (outcome) {
    liveMessage =
      outcome.results.length > 0
        ? `Pencarian selesai. ${outcome.results.length} halaman ditemukan.`
        : 'Pencarian selesai. Tidak ada halaman yang ditemukan.';
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            Temukan di mana sebuah gambar muncul di web
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Unggah satu gambar. Image Source Finder menjalankan reverse image search lewat Google Lens, lalu menampilkan
            halaman yang memuat gambar yang sama atau serupa.
          </p>
        </div>

        <div className="mt-12 space-y-8">
          {api.state === 'not_configured' || api.state === 'unreachable' ? (
            <ApiStatusNotice state={api.state} onRecheck={() => void checkApi()} />
          ) : null}

          {file && previewUrl ? (
            <PreviewPanel
              file={file}
              previewUrl={previewUrl}
              busy={busy}
              canSearch={canSearch}
              maxUploadBytes={api.maxUploadBytes}
              onSearch={() => void search.submit()}
              onClear={search.clear}
            />
          ) : (
            <UploadZone onSelect={search.selectFile} error={search.fileError} />
          )}

          {phase !== 'idle' ? <SearchProgress phase={phase} progress={search.progress} /> : null}

          {error ? <ErrorNotice error={error} onRetry={() => void search.submit()} onReset={search.clear} /> : null}

          {outcome ? <ResultsSection outcome={outcome} onReset={search.clear} /> : null}
        </div>

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {liveMessage}
        </div>
      </main>

      <Footer />
    </div>
  );
}
