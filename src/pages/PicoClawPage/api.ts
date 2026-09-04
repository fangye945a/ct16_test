/** 智能体配置 REST API — 代理至 zhos-claw 后端 (默认 :18800) */

export interface ModelInfo {
  index: number;
  model_name: string;
  provider?: string;
  model: string;
  api_base?: string;
  api_key: string;
  proxy?: string;
  auth_method?: string;
  connect_mode?: string;
  workspace?: string;
  rpm?: number;
  max_tokens_field?: string;
  request_timeout?: number;
  thinking_level?: string;
  tool_schema_transform?: string;
  streaming?: { enabled?: boolean };
  extra_body?: Record<string, unknown>;
  custom_headers?: Record<string, string>;
  enabled: boolean;
  available: boolean;
  status: 'available' | 'unconfigured' | 'unreachable';
  is_default: boolean;
  is_virtual: boolean;
  default_model_allowed?: boolean;
}

export interface ModelProviderOption {
  id: string;
  default_api_base: string;
  empty_api_key_allowed: boolean;
  create_allowed: boolean;
  default_model_allowed: boolean;
  default_auth_method?: string;
  auth_method_locked?: boolean;
}

export interface ModelsListResponse {
  models: ModelInfo[];
  total: number;
  default_model: string;
  provider_options: ModelProviderOption[];
}

export interface ModelActionResponse {
  status: string;
  index?: number;
  default_model?: string;
}

export interface TestModelResponse {
  success: boolean;
  latency_ms: number;
  status: string;
  error?: string;
}

export interface TestModelInlineRequest {
  provider: string;
  model: string;
  api_base?: string;
  api_key?: string;
  auth_method?: string;
  model_index?: number;
}

export type ModelPayload = Partial<
  Pick<
    ModelInfo,
    | 'model_name'
    | 'provider'
    | 'model'
    | 'api_base'
    | 'api_key'
    | 'proxy'
    | 'auth_method'
    | 'connect_mode'
    | 'workspace'
    | 'rpm'
    | 'max_tokens_field'
    | 'request_timeout'
    | 'thinking_level'
    | 'tool_schema_transform'
    | 'streaming'
    | 'extra_body'
    | 'custom_headers'
  >
>;

export interface UpstreamModel {
  id: string;
  owned_by?: string;
  extra?: Record<string, unknown>;
}

export interface FetchModelsRequest {
  provider: string;
  api_key?: string;
  api_base?: string;
}

export interface FetchModelsResponse {
  models: UpstreamModel[];
  total: number;
}

export interface CatalogModel {
  id: string;
  owned_by?: string;
  extra?: Record<string, unknown>;
}

export interface CatalogEntry {
  id: string;
  provider: string;
  api_base: string;
  api_key_mask: string;
  models: CatalogModel[];
  fetched_at: string;
}

interface CatalogListResponse {
  entries: CatalogEntry[];
  total: number;
}

export interface SkillSupportItem {
  name: string;
  path: string;
  source: 'workspace' | 'global' | 'builtin' | string;
  description: string;
  origin_kind: 'builtin' | 'third_party' | 'manual' | string;
  registry_name?: string;
  registry_url?: string;
  installed_version?: string;
  installed_at?: number;
}

export interface SkillDetailResponse extends SkillSupportItem {
  content: string;
}

interface SkillsResponse {
  skills: SkillSupportItem[];
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, { credentials: 'same-origin', ...init });
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const raw = await res.text();
    if (!raw.trim()) return `请求失败: ${res.status} ${res.statusText}`;
    try {
      const body = JSON.parse(raw) as {
        error?: string;
        errors?: string[];
        message?: string;
      };
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        return body.errors.join('; ');
      }
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (typeof body.error === 'string' && body.error.trim()) {
        return body.error;
      }
    } catch {
      return raw.trim();
    }
    return raw.trim();
  } catch {
    return `请求失败: ${res.status} ${res.statusText}`;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }
  return res.json() as Promise<T>;
}

export async function getModels(): Promise<ModelsListResponse> {
  return request<ModelsListResponse>('/api/models');
}

export async function addModel(model: ModelPayload): Promise<ModelActionResponse> {
  return request<ModelActionResponse>('/api/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model),
  });
}

export async function updateModel(
  index: number,
  model: ModelPayload,
): Promise<ModelActionResponse> {
  return request<ModelActionResponse>(`/api/models/${index}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(model),
  });
}

export async function deleteModel(index: number): Promise<ModelActionResponse> {
  return request<ModelActionResponse>(`/api/models/${index}`, {
    method: 'DELETE',
  });
}

export async function setDefaultModel(modelName: string): Promise<ModelActionResponse> {
  return request<ModelActionResponse>('/api/models/default', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_name: modelName }),
  });
}

/** picoclaw agents.defaults 片段（仅读取我们关心的字段） */
interface AgentsDefaultsConfig {
  agents?: {
    defaults?: {
      max_tokens?: number;
    };
  };
}

export interface ConfigActionResponse {
  status: string;
}

const DEFAULT_MAX_TOKENS = 32768;

/** 读取 agents.defaults.max_tokens（与 zhos-claw 服务配置页同源） */
export async function getAgentsDefaultsMaxTokens(): Promise<number> {
  const cfg = await request<AgentsDefaultsConfig>('/api/config');
  const value = cfg.agents?.defaults?.max_tokens;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }
  return DEFAULT_MAX_TOKENS;
}

/**
 * 仅 PATCH agents.defaults.max_tokens，其余 picoclaw 配置保持不变。
 * 对应 zhos-claw 服务配置页对该字段的保存方式。
 */
export async function patchAgentsDefaultsMaxTokens(
  maxTokens: number,
): Promise<ConfigActionResponse> {
  if (!Number.isFinite(maxTokens) || maxTokens < 1) {
    throw new Error('最大 Token 数必须是大于等于 1 的整数');
  }
  return request<ConfigActionResponse>('/api/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agents: {
        defaults: {
          max_tokens: Math.floor(maxTokens),
        },
      },
    }),
  });
}

export interface GatewayStatusResponse {
  gateway_status: 'running' | 'starting' | 'restarting' | 'stopped' | 'error';
  gateway_start_allowed?: boolean;
  gateway_start_reason?: string;
  gateway_restart_required?: boolean;
  pid?: number;
  boot_default_model?: string;
  config_default_model?: string;
}

export interface GatewayActionResponse {
  status: string;
  pid?: number;
  message?: string;
}

export type ApplyDefaultModelAction = 'none' | 'restarted' | 'started';

export interface ApplyDefaultModelResult {
  action: ApplyDefaultModelAction;
}

const GATEWAY_POLL_INTERVAL_MS = 1000;
const GATEWAY_POLL_TIMEOUT_MS = 60_000;
/** restart/start 接口返回后，再等待一小段时间再关遮罩（与 zhos-claw 体感接近） */
const GATEWAY_SETTLE_AFTER_ACTION_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getGatewayStatus(): Promise<GatewayStatusResponse> {
  return request<GatewayStatusResponse>('/api/gateway/status');
}

export async function startGateway(): Promise<GatewayActionResponse> {
  return request<GatewayActionResponse>('/api/gateway/start', {
    method: 'POST',
  });
}

export async function restartGateway(): Promise<GatewayActionResponse> {
  return request<GatewayActionResponse>('/api/gateway/restart', {
    method: 'POST',
  });
}

function isGatewayReadyForModel(
  status: GatewayStatusResponse,
  modelName: string,
): boolean {
  if (status.gateway_status !== 'running') return false;
  if (status.gateway_restart_required) return false;
  const configModel = (status.config_default_model ?? '').trim();
  const bootModel = (status.boot_default_model ?? '').trim();
  if (configModel !== modelName) return false;
  return bootModel === '' || bootModel === modelName;
}

async function waitUntilGatewaySettled(): Promise<GatewayStatusResponse> {
  const deadline = Date.now() + GATEWAY_POLL_TIMEOUT_MS;
  let last = await getGatewayStatus();

  while (
    Date.now() < deadline &&
    (last.gateway_status === 'starting' || last.gateway_status === 'restarting')
  ) {
    await sleep(GATEWAY_POLL_INTERVAL_MS);
    last = await getGatewayStatus();
  }

  return last;
}

/**
 * 写入默认模型配置，并在需要时重启/启动 gateway。
 * restart/start 成功后固定再等 2 秒（不再轮询至 running），以便尽快关闭遮罩。
 */
export async function applyDefaultModel(
  modelName: string,
): Promise<ApplyDefaultModelResult> {
  const name = modelName.trim();
  if (!name) {
    throw new Error('model_name is required');
  }

  await setDefaultModel(name);
  return ensureGatewayAppliedForModel(name);
}

/**
 * 确认保存「默认模型 + max_tokens」。
 * - max_tokens 仅 PATCH agents.defaults.max_tokens，其它配置不动
 * - max_tokens 变更后强制重启网关（运行中的 agent 在启动时读入该值）
 * - 默认模型变更沿用原 applyDefaultModel 网关同步逻辑
 */
export async function applyAgentSelectionSettings(opts: {
  modelName?: string | null;
  maxTokens?: number | null;
}): Promise<ApplyDefaultModelResult> {
  const name = opts.modelName?.trim() || '';
  const maxTokens =
    typeof opts.maxTokens === 'number' && Number.isFinite(opts.maxTokens)
      ? Math.floor(opts.maxTokens)
      : null;

  if (!name && maxTokens === null) {
    return { action: 'none' };
  }

  if (maxTokens !== null) {
    await patchAgentsDefaultsMaxTokens(maxTokens);
  }

  if (name) {
    await setDefaultModel(name);
    return ensureGatewayAppliedForModel(name, { forceRestartWhenRunning: maxTokens !== null });
  }

  // 仅改 max_tokens：尽量让网关重新加载配置
  return ensureGatewayAppliedForMaxTokens();
}

async function ensureGatewayAppliedForMaxTokens(): Promise<ApplyDefaultModelResult> {
  let status = await getGatewayStatus();
  if (status.gateway_status === 'starting' || status.gateway_status === 'restarting') {
    status = await waitUntilGatewaySettled();
  }

  if (status.gateway_status === 'running') {
    try {
      await restartGateway();
    } catch (e) {
      const reason = e instanceof Error ? e.message : '智能体网关重启失败';
      throw new Error(`最大 Token 数已保存，但网关重启失败：${reason}`);
    }
    await sleep(GATEWAY_SETTLE_AFTER_ACTION_MS);
    return { action: 'restarted' };
  }

  if (
    (status.gateway_status === 'stopped' || status.gateway_status === 'error') &&
    status.gateway_start_allowed
  ) {
    try {
      await startGateway();
    } catch (e) {
      const reason = e instanceof Error ? e.message : '智能体网关启动失败';
      throw new Error(`最大 Token 数已保存，但网关启动失败：${reason}`);
    }
    await sleep(GATEWAY_SETTLE_AFTER_ACTION_MS);
    return { action: 'started' };
  }

  await sleep(GATEWAY_SETTLE_AFTER_ACTION_MS);
  return { action: 'none' };
}

async function ensureGatewayAppliedForModel(
  modelName: string,
  opts?: { forceRestartWhenRunning?: boolean },
): Promise<ApplyDefaultModelResult> {
  let status = await getGatewayStatus();
  if (status.gateway_status === 'starting' || status.gateway_status === 'restarting') {
    status = await waitUntilGatewaySettled();
  }

  if (!opts?.forceRestartWhenRunning && isGatewayReadyForModel(status, modelName)) {
    return { action: 'none' };
  }

  if (
    status.gateway_status === 'running' &&
    (status.gateway_restart_required || opts?.forceRestartWhenRunning)
  ) {
    try {
      await restartGateway();
    } catch (e) {
      const reason = e instanceof Error ? e.message : '智能体网关重启失败';
      throw new Error(`配置已保存，但网关重启失败：${reason}`);
    }
    await sleep(GATEWAY_SETTLE_AFTER_ACTION_MS);
    return { action: 'restarted' };
  }

  if (
    (status.gateway_status === 'stopped' || status.gateway_status === 'error') &&
    status.gateway_start_allowed
  ) {
    try {
      await startGateway();
    } catch (e) {
      const reason = e instanceof Error ? e.message : '智能体网关启动失败';
      throw new Error(`配置已保存，但网关启动失败：${reason}`);
    }
    await sleep(GATEWAY_SETTLE_AFTER_ACTION_MS);
    return { action: 'started' };
  }

  if (
    (status.gateway_status === 'stopped' || status.gateway_status === 'error') &&
    !status.gateway_start_allowed
  ) {
    throw new Error(
      status.gateway_start_reason ||
        '配置已保存，但智能体网关当前无法启动，新配置尚未生效',
    );
  }

  await sleep(GATEWAY_SETTLE_AFTER_ACTION_MS);
  return { action: 'none' };
}

export async function testModel(index: number): Promise<TestModelResponse> {
  return request<TestModelResponse>(`/api/models/${index}/test`, {
    method: 'POST',
  });
}

export async function testModelInline(
  params: TestModelInlineRequest,
): Promise<TestModelResponse> {
  return request<TestModelResponse>('/api/models/test-inline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function fetchUpstreamModels(
  req: FetchModelsRequest,
): Promise<FetchModelsResponse> {
  return request<FetchModelsResponse>('/api/models/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

export async function getCatalogs(): Promise<CatalogListResponse> {
  return request<CatalogListResponse>('/api/models/catalog');
}

export async function getSkills(): Promise<SkillsResponse> {
  return request<SkillsResponse>('/api/skills');
}

export async function getSkill(name: string): Promise<SkillDetailResponse> {
  return request<SkillDetailResponse>(`/api/skills/${encodeURIComponent(name)}`);
}

export async function importSkill(file: File): Promise<SkillSupportItem> {
  const formData = new FormData();
  formData.set('file', file);
  const res = await apiFetch('/api/skills/import', {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res));
  }
  return res.json() as Promise<SkillSupportItem>;
}

export async function deleteSkill(name: string): Promise<{ status?: string }> {
  return request<{ status?: string }>(`/api/skills/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}
