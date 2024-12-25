/// <reference types="vite/client" />

interface ImportMetaEnv {
   readonly VITE_BASE_URL_API: string;
   readonly VITE_ACCESS_TOKEN_KEY: string;
   readonly VITE_REFRESH_TOKEN_KEY: string;
}

interface ImportMeta {
   readonly env: ImportMetaEnv;
}
