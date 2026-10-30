import type { ReactNode } from 'react';

interface ViewfinderFrameProps {
  children: ReactNode;
  /** Sudut membesar saat area aktif (mis. gambar sedang diseret ke atasnya). */
  active?: boolean;
  className?: string;
}

/** Empat siku bidik di sudut area gambar: satu-satunya elemen dekoratif di halaman. */
export function ViewfinderFrame({ children, active = false, className = '' }: ViewfinderFrameProps) {
  const size = active ? 'h-8 w-8' : 'h-5 w-5';
  const corner = `pointer-events-none absolute ${size} border-fg transition-all duration-150`;
  return (
    <div className={`relative ${className}`}>
      <span aria-hidden="true" className={`${corner} -left-2 -top-2 border-l-2 border-t-2`} />
      <span aria-hidden="true" className={`${corner} -right-2 -top-2 border-r-2 border-t-2`} />
      <span aria-hidden="true" className={`${corner} -bottom-2 -left-2 border-b-2 border-l-2`} />
      <span aria-hidden="true" className={`${corner} -bottom-2 -right-2 border-b-2 border-r-2`} />
      {children}
    </div>
  );
}
