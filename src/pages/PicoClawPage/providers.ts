import type { ModelProviderOption } from './api';

/**
 * 厂商注册表 — 与 zhos-claw `provider-registry.ts` 保持同步。
 * defaultApiBase / supportsFetch / requiresApiKey 决定切换厂商时的 API Base 填充与「获取可用模型」按钮。
 */
export interface ProviderDefinition {
  key: string;
  label: string;
  labelZh?: string;
  defaultApiBase?: string;
  requiresApiKey: boolean;
  isLocal: boolean;
  priority: number;
  commonModels?: string[];
  aliases?: string[];
  /** 是否支持 OpenAI 兼容的 /models 列表接口 */
  supportsFetch?: boolean;
}

export const PROVIDERS: ProviderDefinition[] = [
  {
    key: 'openai',
    label: 'OpenAI',
    defaultApiBase: 'https://api.openai.com/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 100,
    commonModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o3-mini'],
    aliases: ['gpt'],
    supportsFetch: true,
  },
  {
    key: 'anthropic',
    label: 'Anthropic',
    defaultApiBase: 'https://api.anthropic.com/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 95,
    commonModels: [
      'claude-sonnet-4-20250514',
      'claude-haiku-4-20250414',
      'claude-3-5-sonnet-20241022',
    ],
    aliases: ['claude'],
  },
  {
    key: 'gemini',
    label: 'Google Gemini',
    defaultApiBase: 'https://generativelanguage.googleapis.com/v1beta',
    requiresApiKey: true,
    isLocal: false,
    priority: 90,
    commonModels: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-1.5-flash'],
    aliases: ['google'],
  },
  {
    key: 'deepseek',
    label: 'DeepSeek',
    defaultApiBase: 'https://api.deepseek.com/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 85,
    commonModels: ['deepseek-chat', 'deepseek-reasoner'],
    supportsFetch: true,
  },
  {
    key: 'openrouter',
    label: 'OpenRouter',
    defaultApiBase: 'https://openrouter.ai/api/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 80,
    commonModels: [
      'openai/gpt-4o',
      'anthropic/claude-sonnet-4',
      'google/gemini-2.0-flash',
    ],
    supportsFetch: true,
  },
  {
    key: 'qwen-portal',
    label: 'Qwen',
    labelZh: 'Qwen (阿里云)',
    defaultApiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 75,
    commonModels: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    aliases: ['qwen'],
    supportsFetch: true,
  },
  {
    key: 'qwen-intl',
    label: 'Qwen International',
    labelZh: 'Qwen International (阿里云国际)',
    defaultApiBase: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 74,
    commonModels: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    aliases: ['qwen-international', 'dashscope-intl'],
    supportsFetch: true,
  },
  {
    key: 'moonshot',
    label: 'Moonshot',
    labelZh: 'Moonshot (月之暗面)',
    defaultApiBase: 'https://api.moonshot.cn/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 70,
    commonModels: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    supportsFetch: true,
  },
  {
    key: 'volcengine',
    label: 'Volcengine',
    labelZh: 'Volcengine (火山引擎)',
    defaultApiBase: 'https://ark.cn-beijing.volces.com/api/v3',
    requiresApiKey: true,
    isLocal: false,
    priority: 69,
    commonModels: ['doubao-1.5-pro', 'doubao-1.5-lite'],
    supportsFetch: true,
  },
  {
    key: 'zhipu',
    label: 'Zhipu AI',
    labelZh: 'Zhipu AI (智谱)',
    defaultApiBase: 'https://open.bigmodel.cn/api/paas/v4',
    requiresApiKey: true,
    isLocal: false,
    priority: 68,
    commonModels: ['glm-4-plus', 'glm-4-flash'],
    supportsFetch: true,
  },
  {
    key: 'groq',
    label: 'Groq',
    defaultApiBase: 'https://api.groq.com/openai/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 65,
    commonModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    supportsFetch: true,
  },
  {
    key: 'mistral',
    label: 'Mistral AI',
    defaultApiBase: 'https://api.mistral.ai/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 64,
    commonModels: ['mistral-large-latest', 'mistral-small-latest'],
    supportsFetch: true,
  },
  {
    key: 'nvidia',
    label: 'NVIDIA',
    defaultApiBase: 'https://integrate.api.nvidia.com/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 63,
    commonModels: ['meta/llama-3.1-405b-instruct'],
    supportsFetch: true,
  },
  {
    key: 'cerebras',
    label: 'Cerebras',
    defaultApiBase: 'https://api.cerebras.ai/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 62,
    commonModels: ['llama3.1-8b', 'llama3.1-70b'],
    supportsFetch: true,
  },
  {
    key: 'azure',
    label: 'Azure OpenAI',
    requiresApiKey: true,
    isLocal: false,
    priority: 61,
    commonModels: ['gpt-4o', 'gpt-4o-mini'],
  },
  {
    key: 'github-copilot',
    label: 'GitHub Copilot',
    requiresApiKey: false,
    isLocal: true,
    priority: 55,
  },
  {
    key: 'antigravity',
    label: 'Google Code Assist',
    requiresApiKey: false,
    isLocal: false,
    priority: 54,
  },
  {
    key: 'ollama',
    label: 'Ollama',
    labelZh: 'Ollama (本地)',
    defaultApiBase: 'http://localhost:11434/v1',
    requiresApiKey: false,
    isLocal: true,
    priority: 50,
    commonModels: ['llama3', 'mistral', 'codellama', 'qwen2.5'],
    supportsFetch: true,
  },
  {
    key: 'vllm',
    label: 'VLLM',
    labelZh: 'VLLM (本地)',
    defaultApiBase: 'http://localhost:8000/v1',
    requiresApiKey: false,
    isLocal: true,
    priority: 49,
    supportsFetch: true,
  },
  {
    key: 'lmstudio',
    label: 'LM Studio',
    labelZh: 'LM Studio (本地)',
    defaultApiBase: 'http://localhost:1234/v1',
    requiresApiKey: false,
    isLocal: true,
    priority: 48,
    supportsFetch: true,
  },
  {
    key: 'venice',
    label: 'Venice AI',
    defaultApiBase: 'https://api.venice.ai/api/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 45,
    supportsFetch: true,
  },
  {
    key: 'shengsuanyun',
    label: 'ShengsuanYun',
    labelZh: 'ShengsuanYun (神算云)',
    defaultApiBase: 'https://router.shengsuanyun.com/api/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 44,
    supportsFetch: true,
  },
  {
    key: 'siliconflow',
    label: 'SiliconFlow',
    labelZh: '硅基流动',
    defaultApiBase: 'https://api.siliconflow.cn/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 43.5,
    supportsFetch: true,
  },
  {
    key: 'vivgrid',
    label: 'Vivgrid',
    defaultApiBase: 'https://api.vivgrid.com/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 43,
    supportsFetch: true,
  },
  {
    key: 'minimax',
    label: 'MiniMax',
    defaultApiBase: 'https://api.minimaxi.com/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 42,
    supportsFetch: true,
  },
  {
    key: 'longcat',
    label: 'LongCat',
    defaultApiBase: 'https://api.longcat.chat/openai',
    requiresApiKey: true,
    isLocal: false,
    priority: 41,
    supportsFetch: true,
  },
  {
    key: 'modelscope',
    label: 'ModelScope',
    labelZh: 'ModelScope (魔搭社区)',
    defaultApiBase: 'https://api-inference.modelscope.cn/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 40,
    supportsFetch: true,
  },
  {
    key: 'mimo',
    label: 'Xiaomi MiMo',
    defaultApiBase: 'https://api.xiaomimimo.com/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 39,
    supportsFetch: true,
  },
  {
    key: 'avian',
    label: 'Avian',
    defaultApiBase: 'https://api.avian.io/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 38,
    supportsFetch: true,
  },
  {
    key: 'zai',
    label: 'Z.ai',
    defaultApiBase: 'https://api.z.ai/api/coding/paas/v4',
    requiresApiKey: true,
    isLocal: false,
    priority: 37,
    aliases: ['z.ai', 'z-ai'],
    supportsFetch: true,
  },
  {
    key: 'novita',
    label: 'Novita AI',
    defaultApiBase: 'https://api.novita.ai/openai',
    requiresApiKey: true,
    isLocal: false,
    priority: 36,
    supportsFetch: true,
  },
  {
    key: 'litellm',
    label: 'LiteLLM',
    defaultApiBase: 'http://localhost:4000/v1',
    requiresApiKey: true,
    isLocal: false,
    priority: 35,
    supportsFetch: true,
  },
];

export const PROVIDER_MAP = new Map(PROVIDERS.map((p) => [p.key, p]));

export const PROVIDER_ALIASES: Record<string, string> = Object.fromEntries(
  PROVIDERS.flatMap((p) => (p.aliases || []).map((a) => [a, p.key])),
);

export const KNOWN_PROVIDER_KEYS = new Set(PROVIDERS.map((p) => p.key));

export const FETCHABLE_PROVIDER_KEYS = new Set(
  PROVIDERS.filter((p) => p.supportsFetch).map((p) => p.key),
);

export function getProviderDisplayLabel(p: Pick<ProviderDefinition, 'label' | 'labelZh'>): string {
  return p.labelZh || p.label;
}

export function getProviderLabel(provider?: string): string {
  if (!provider) return '其他';
  const def = PROVIDER_MAP.get(provider);
  if (def) return getProviderDisplayLabel(def);
  return provider;
}

export function getProviderKey(provider?: string): string {
  if (!provider) return 'other';
  const lower = provider.toLowerCase();
  if (KNOWN_PROVIDER_KEYS.has(lower)) return lower;
  return PROVIDER_ALIASES[lower] ?? lower;
}

export function getProviderDefaultApiBase(provider?: string): string {
  if (!provider) return '';
  return PROVIDER_MAP.get(provider)?.defaultApiBase ?? '';
}

export function getProviderCommonModels(provider?: string): string[] {
  if (!provider) return [];
  return PROVIDER_MAP.get(provider)?.commonModels ?? [];
}

/** 与 zhos-claw add-model-sheet 相同：仅在空值或仍为上一厂商默认值时替换 */
export function normalizeApiBase(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getNextApiBaseForProviderChange(
  currentApiBase: string,
  currentProvider: string,
  nextProvider: string,
): string {
  const normalizedCurrentApiBase = normalizeApiBase(currentApiBase);
  const currentDefaultApiBase = normalizeApiBase(
    PROVIDER_MAP.get(currentProvider)?.defaultApiBase ?? '',
  );
  const nextDefaultApiBase = PROVIDER_MAP.get(nextProvider)?.defaultApiBase ?? '';

  if (!normalizedCurrentApiBase) {
    return nextDefaultApiBase;
  }

  if (
    normalizedCurrentApiBase &&
    currentDefaultApiBase &&
    normalizedCurrentApiBase === currentDefaultApiBase
  ) {
    return nextDefaultApiBase;
  }

  return currentApiBase;
}

export interface MergedProvider extends ProviderDefinition {
  createAllowed: boolean;
  defaultModelAllowed: boolean;
  defaultAuthMethod?: string;
  authMethodLocked?: boolean;
}

/**
 * 合并前端展示信息与后端 provider_options。
 * 策略字段与 zhos-claw `mergeWithBackendOptions` 一致：
 * - 已知厂商保留前端 defaultApiBase / requiresApiKey / supportsFetch
 * - create_allowed / default_model_allowed 缺省为 false
 * - 仅后端已知的厂商追加到列表（不强制 supportsFetch）
 */
export function mergeProviders(backendOptions: ModelProviderOption[]): MergedProvider[] {
  const backendMap = new Map(backendOptions.map((o) => [o.id, o]));
  const merged: MergedProvider[] = [];

  for (const p of PROVIDERS) {
    const backend = backendMap.get(p.key);
    merged.push({
      ...p,
      createAllowed: backend?.create_allowed ?? false,
      defaultModelAllowed: backend?.default_model_allowed ?? false,
      defaultAuthMethod: backend?.default_auth_method,
      authMethodLocked: backend?.auth_method_locked,
    });
    if (backend) backendMap.delete(p.key);
  }

  for (const [key, backend] of backendMap) {
    merged.push({
      key,
      label: key,
      requiresApiKey: !backend.empty_api_key_allowed,
      isLocal: backend.empty_api_key_allowed,
      priority: 0,
      createAllowed: backend.create_allowed,
      defaultModelAllowed: backend.default_model_allowed,
      defaultAuthMethod: backend.default_auth_method,
      authMethodLocked: backend.auth_method_locked,
      defaultApiBase: backend.default_api_base || undefined,
    });
  }

  return merged.sort((a, b) => b.priority - a.priority);
}

/** 添加/编辑表单下拉：仅 create_allowed；后端尚未返回时回退为全量前端列表 */
export function getCreatableProviders(backendOptions: ModelProviderOption[]): MergedProvider[] {
  if (backendOptions.length === 0) {
    return [...PROVIDERS]
      .sort((a, b) => b.priority - a.priority)
      .map((p) => ({
        ...p,
        createAllowed: true,
        defaultModelAllowed: false,
      }));
  }
  return mergeProviders(backendOptions).filter((p) => p.createAllowed);
}

export function findClosestProvider(input: string): string | undefined {
  const lower = input.toLowerCase();
  let best: string | undefined;
  let bestDist = 3;

  for (const key of KNOWN_PROVIDER_KEYS) {
    const dist = editDistance(lower, key);
    if (dist < bestDist) {
      bestDist = dist;
      best = key;
    }
  }
  for (const alias of Object.keys(PROVIDER_ALIASES)) {
    const dist = editDistance(lower, alias);
    if (dist < bestDist) {
      bestDist = dist;
      best = PROVIDER_ALIASES[alias];
    }
  }
  return best;
}

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'available':
      return '可用';
    case 'unreachable':
      return '不可达';
    case 'unconfigured':
      return '未配置';
    default:
      return status;
  }
}

export function originLabel(origin: string): string {
  switch (origin) {
    case 'builtin':
      return '内置';
    case 'third_party':
      return '第三方';
    case 'manual':
      return '手动';
    default:
      return origin;
  }
}

export function sourceLabel(source: string): string {
  switch (source) {
    case 'workspace':
      return '工作区';
    case 'global':
      return '全局';
    case 'builtin':
      return '内置';
    default:
      return source;
  }
}
