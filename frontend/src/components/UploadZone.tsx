import { useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { ACCEPT_ATTRIBUTE } from '../utils/imageFile';
import { btnPrimary } from './ui';
import { ViewfinderFrame } from './ViewfinderFrame';

interface UploadZoneProps {
  onSelect: (file: File) => void;
  error: string | null;
}

export function UploadZone({ onSelect, error }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onSelect(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onSelect(file);
    event.target.value = '';
  };

  return (
    <div>
      <ViewfinderFrame active={dragging} className="m-2">
        <div
          onDragEnter={handleDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex min-h-[18rem] flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed px-6 py-12 text-center transition-colors ${
            dragging ? 'border-fg bg-surface' : 'border-line-strong'
          }`}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className="text-fg">
            <path
              d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="space-y-1">
            <p className="text-lg font-medium">Seret gambar ke sini</p>
            <p className="text-sm text-muted">atau pilih dari komputer Anda</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            onChange={handleChange}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          />
          <button
            type="button"
            className={btnPrimary}
            onClick={() => inputRef.current?.click()}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          >
            Pilih gambar
          </button>
          <p id={hintId} className="max-w-md text-sm text-muted">
            JPG, PNG, atau WebP, maksimum 15 MB. Layanan pencarian menerima hingga 500 KB, jadi gambar yang lebih
            besar dikecilkan otomatis di browser Anda sebelum dikirim.
          </p>
        </div>
      </ViewfinderFrame>
      {error ? (
        <p id={errorId} role="alert" className="mt-4 rounded-md border border-fg px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
