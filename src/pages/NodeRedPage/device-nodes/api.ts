/** 节点管理 REST API — 代理至 zhos-claw 后端 (默认 :18800) */

export interface NodePin {
  name: string;
  type: string;
  direction: 'input' | 'output';
}

export interface NodeDefault {
  name: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
}

export interface PinConfigEntry {
  id: string;
  type: string;
}

export interface NodeMeta {
  code: string;
  name: string;
  version: string;
  /** 设备类型：引脚 pin / 串口 serial（后端从节点 HTML defaults 解析） */
  deviceKind?: 'pin' | 'serial' | string;
  commands: string[];
  inputPins: NodePin[];
  outputPins: NodePin[];
  description: string;
  scripts?: Record<string, string>;
  defaults?: NodeDefault[];
  pinConfigs?: PinConfigEntry[];
  files: { html: string; js: string };
  updatedAt: string;
}

export interface SimulateRequest {
  nodeCode: string;
  command: string;
  pins: Record<string, unknown>;
  params?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  script?: string;
  deviceKind?: string;
  config?: Record<string, unknown>;
  info?: Record<string, unknown>;
}

export interface SimulateResponse {
  status: string;
  output: unknown;
  duration: string;
  timestamp: string;
  execResult?: string;
  execError?: string;
}

export interface GatewayStatusResponse {
  gateway_status: 'running' | 'starting' | 'restarting' | 'stopped' | 'error';
  gateway_start_allowed?: boolean;
  gateway_start_reason?: string;
  gateway_restart_required?: boolean;
  pid?: number;
}

interface NodesResponse {
  nodes: NodeMeta[];
}

interface NodeDetailResponse {
  node: NodeMeta;
  files: { html: string; js: string };
}

interface PinsResponse {
  pins: NodePin[];
}

async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, { credentials: 'same-origin', ...init });
}

export async function getNodes(): Promise<NodeMeta[]> {
  const res = await apiFetch('/api/nodes');
  if (!res.ok) throw new Error(`Failed to fetch nodes: ${res.status}`);
  const data = (await res.json()) as NodesResponse;
  return data.nodes ?? [];
}

export async function getNode(code: string): Promise<NodeDetailResponse> {
  const res = await apiFetch(`/api/nodes/${encodeURIComponent(code)}`);
  if (!res.ok) throw new Error(`Failed to fetch node: ${res.status}`);
  return res.json() as Promise<NodeDetailResponse>;
}

export async function deleteNode(code: string): Promise<void> {
  const res = await apiFetch(`/api/nodes/${encodeURIComponent(code)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete node: ${res.status}`);
}

export async function getNodePins(code: string): Promise<NodePin[]> {
  const res = await apiFetch(`/api/nodes/${encodeURIComponent(code)}/pins`);
  if (!res.ok) throw new Error(`Failed to fetch pins: ${res.status}`);
  const data = (await res.json()) as PinsResponse;
  return data.pins ?? [];
}

export async function simulate(req: SimulateRequest): Promise<SimulateResponse> {
  const res = await apiFetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Simulation failed: ${res.status}`);
  return res.json() as Promise<SimulateResponse>;
}

export async function getGatewayStatus(): Promise<GatewayStatusResponse> {
  const res = await apiFetch('/api/gateway/status');
  if (!res.ok) throw new Error(`Failed to fetch gateway status: ${res.status}`);
  return res.json() as Promise<GatewayStatusResponse>;
}
