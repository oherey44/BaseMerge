/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WEB_API_BASE?: string;
  readonly VITE_WEB_ASSET_BASE?: string;
  readonly VITE_SEASON_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
