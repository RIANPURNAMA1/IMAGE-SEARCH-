import type { UiError } from '../types';
import { btnPrimary, btnSecondary } from './ui';

const HINTS: Record<string, string> = {
  NOT_CONFIGURED: 'Isi SERPAPI_API_KEY pada backend/.env lalu restart server.',
  PROVIDER_AUTH_FAILED: 'Periksa kembali SERPAPI_API_KEY di backend/.env, lalu restart server.',
  PROVIDER_QUOTA_EXCEEDED: 'Kuota SerpApi Anda mungkin habis. Periksa paket Anda di dashboard SerpApi.',
  RATE_LIMITED: 'Tunggu satu menit sebelum mencari lagi.',
  FILE_TOO_LARGE: 'Gunakan gambar yang lebih kecil atau potong gambar lebih dulu.',
  UNSUPPORTED_TYPE: 'Gunakan file JPG, PNG, atau WebP yang valid.',
};

interface ErrorNoticeProps {
  error: UiError;
  onRetry: () => void;
  onReset: () => void;
}

export function ErrorNotice({ error, onRetry, onReset }: ErrorNoticeProps) {
  const hint = HINTS[error.code];
  return (
    <div role="alert" className="space-y-4 rounded-md border border-fg p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-bold tracking-tight">Pencarian gagal</h2>
        <p>{error.message}</p>
        {hint ? <p className="text-sm text-muted">{hint}</p> : null}
        <p className="text-xs text-muted">Kode: {error.code}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {error.retryable ? (
          <button type="button" className={btnPrimary} onClick={onRetry}>
            Coba lagi
          </button>
        ) : null}
        <button type="button" className={btnSecondary} onClick={onReset}>
          Gunakan gambar lain
        </button>
      </div>
    </div>
  );
}
