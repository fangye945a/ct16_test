/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CT16_API_BASE?: string
  readonly VITE_NODE_RED_PATH?: string
  readonly VITE_WORKFLOW_AI_API_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
