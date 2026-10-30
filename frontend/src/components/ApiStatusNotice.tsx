import { btnSecondary } from './ui';

interface ApiStatusNoticeProps {
  state: 'not_configured' | 'unreachable';
  onRecheck: () => void;
}

const code = 'rounded bg-surface px-1.5 py-0.5 font-mono text-[13px]';

export function ApiStatusNotice({ state, onRecheck }: ApiStatusNoticeProps) {
  if (state === 'unreachable') {
    return (
      <div role="alert" className="space-y-3 rounded-md border border-fg p-5">
        <h2 className="text-lg font-bold tracking-tight">Server tidak dapat dihubungi</h2>
        <p className="text-sm">
          Pastikan backend berjalan (<code className={code}>npm run dev</code> di folder proyek), lalu periksa lagi.
        </p>
        <button type="button" className={btnSecondary} onClick={onRecheck}>
          Periksa lagi
        </button>
      </div>
    );
  }

  return (
    <div role="status" className="space-y-4 rounded-md border border-fg p-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">API belum dikonfigurasi</h2>
        <p className="mt-1 text-sm text-muted">
          Pencarian dinonaktifkan sampai API key SerpApi diisi di server. Tidak ada hasil contoh yang ditampilkan.
        </p>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>
          Buat atau salin API key di dashboard SerpApi (<span className="font-medium">serpapi.com/dashboard</span>).
        </li>
        <li>
          Salin <code className={code}>.env.example</code> menjadi <code className={code}>backend/.env</code>.
        </li>
        <li>
          Isi <code className={code}>SERPAPI_API_KEY=…</code>, lalu restart <code className={code}>npm run dev</code>.
        </li>
      </ol>
      <button type="button" className={btnSecondary} onClick={onRecheck}>
        Periksa lagi
      </button>
    </div>
  );
}
