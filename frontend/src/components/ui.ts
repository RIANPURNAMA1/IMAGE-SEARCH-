const base =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40';

/** Tombol utama: kontras maksimum (hitam di mode terang, putih di mode gelap). */
export const btnPrimary = `${base} bg-fg text-bg hover:bg-fg/85`;

/** Tombol sekunder: garis tipis. */
export const btnSecondary = `${base} border border-line-strong bg-bg text-fg hover:bg-surface`;
