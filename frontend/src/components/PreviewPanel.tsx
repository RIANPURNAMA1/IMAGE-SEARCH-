import { formatBytes } from '../utils/format';
import { btnPrimary, btnSecondary } from './ui';
import { ViewfinderFrame } from './ViewfinderFrame';

interface PreviewPanelProps {
  file: File;
  previewUrl: string;
  busy: boolean;
  canSearch: boolean;
  maxUploadBytes: number;
  onSearch: () => void;
  onClear: () => void;
}

export function PreviewPanel({ file, previewUrl, busy, canSearch, maxUploadBytes, onSearch, onClear }: PreviewPanelProps) {
  const willShrink = file.size > maxUploadBytes;

  return (
    <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
      <ViewfinderFrame className="m-2">
        <div className="flex max-h-[28rem] min-h-[14rem] items-center justify-center overflow-hidden rounded-md border border-line bg-surface">
          <img
            src={previewUrl}
            alt={`Pratinjau gambar yang akan dicari: ${file.name}`}
            className="max-h-[28rem] w-full object-contain"
          />
        </div>
      </ViewfinderFrame>

      <div className="space-y-6">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted">Nama file</dt>
            <dd className="break-all font-medium">{file.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Ukuran</dt>
            <dd className="font-medium">
              {formatBytes(file.size)}
              {willShrink ? <span className="font-normal text-muted"> (akan dikecilkan hingga di bawah 500 KB)</span> : null}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <button type="button" className={btnPrimary} onClick={onSearch} disabled={!canSearch || busy} aria-busy={busy}>
            {busy ? 'Mencari…' : 'Cari sumber gambar'}
          </button>
          <button type="button" className={btnSecondary} onClick={onClear}>
            Hapus
          </button>
        </div>

        <p className="text-sm text-muted">
          Gambar dikirim ke layanan eksternal (SerpApi dan Google Lens) untuk dicari. Aplikasi ini tidak menyimpannya
          setelah pencarian selesai.
        </p>
      </div>
    </div>
  );
}
