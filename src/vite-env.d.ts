/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_MOCK_LEARNING?: string
  readonly VITE_OAUTH_ENABLED?: string
  readonly VITE_USE_MOCK_ROCKET?: string
  readonly VITE_SUPABASE_MEDIA_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
