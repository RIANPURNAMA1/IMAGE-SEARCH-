/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Opsional: base URL backend bila frontend dan backend di-deploy terpisah (bukan secret). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
