/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_UPSTASH_REST_URL: string
  readonly VITE_UPSTASH_REST_TOKEN: string
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
