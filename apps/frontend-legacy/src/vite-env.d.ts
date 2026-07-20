/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_PORT: string;
  readonly VITE_BASE_URL_BACKEND?: string;
  readonly VITE_WS_HOST: string;
  readonly VITE_WS_PORT: string;
  readonly VITE_DEFAULT_CHANNEL: string;
  readonly VITE_API_DATA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
