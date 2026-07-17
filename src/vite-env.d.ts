interface ImportMetaEnv {
  readonly VITE_NODE_RED_PATH?: string
  readonly VITE_WORKFLOW_AI_API_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
