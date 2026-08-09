/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KVDB_BUCKET_ID: string
  readonly VITE_KVDB_WRITE_KEY: string
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
