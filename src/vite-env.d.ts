/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER_MODE: 'mock' | 'live';
  readonly VITE_QWEN_WORKER_URL: string;
  readonly VITE_FLUX_WORKER_URL: string;
  readonly VITE_MINIMAX_WORKER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}