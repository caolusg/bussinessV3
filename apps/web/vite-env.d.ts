/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SESSION_STORAGE?: 'session' | 'local';
  readonly VITE_SESSION_IDLE_TIMEOUT_MINUTES?: string;
  readonly VITE_SESSION_ABSOLUTE_TIMEOUT_HOURS?: string;
  readonly VITE_AUTH_TOKEN_STORAGE?: 'session' | 'local';
  readonly VITE_AUTH_IDLE_TIMEOUT_MINUTES?: string;
  readonly VITE_AUTH_ABSOLUTE_TIMEOUT_HOURS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
