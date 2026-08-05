import { MOCK_ALERT_EVENTS, MOCK_SYSTEM_INFO, MOCK_SYSTEM_METRICS, type IAlertEvent, type ISystemInfo, type ISystemMetrics } from '@/data/dashboard';
import { MOCK_MARKET_SKILLS, MOCK_SKILLS } from '@/data/picoclaw';

const RUNTIME_PREFIX = 'zaihong:prototype-runtime';

function Sleep<T>(value: T, delay = 220): Promise<T> {
  return new Promise((resolve) => window.setTimeout(() => resolve(value), delay));
}

function Clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ReadStore<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(`${RUNTIME_PREFIX}:${key}`);
    return value ? JSON.parse(value) as T : Clone(fallback);
  } catch {
    return Clone(fallback);
  }
}

function WriteStore<T>(key: string, value: T): void {
  localStorage.setItem(`${RUNTIME_PREFIX}:${key}`, JSON.stringify(value));
}

function NewId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function Clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface PrototypeOverview {
  systemInfo: ISystemInfo;
  metrics: ISystemMetrics;
  alerts: IAlertEvent[];
}

export async function GetPrototypeOverview(): Promise<PrototypeOverview> {
  const metrics = Clone(MOCK_SYSTEM_METRICS);
  const shift = (value: number, range: number) => Math.round(Clamp(value + (Math.random() - 0.5) * range, 0, 100) * 10) / 10;
  metrics.cpuUsage = shift(metrics.cpuUsage, 5);
  metrics.memoryUsage = shift(metrics.memoryUsage, 3);
  metrics.diskUsage = shift(metrics.diskUsage, 1);
  metrics.networkIn = Math.round(Clamp(metrics.networkIn + (Math.random() - 0.5) * 3, 0.1, 999) * 10) / 10;
  metrics.networkOut = Math.round(Clamp(metrics.networkOut + (Math.random() - 0.5) * 1.5, 0.1, 999) * 10) / 10;
  metrics.cpuTrend = [...metrics.cpuTrend.slice(1), metrics.cpuUsage];
  metrics.memoryTrend = [...metrics.memoryTrend.slice(1), metrics.memoryUsage];
  metrics.diskTrend = [...metrics.diskTrend.slice(1), metrics.diskUsage];
  metrics.networkTrend = [...metrics.networkTrend.slice(1), metrics.networkIn];
  metrics.overallStatus = metrics.cpuUsage > 88 || metrics.memoryUsage > 90 ? 'warning' : 'normal';
  return Sleep({ systemInfo: Clone(MOCK_SYSTEM_INFO), metrics, alerts: Clone(MOCK_ALERT_EVENTS) });
}

export type PrototypeLogKind = 'file' | 'exception';

export interface PrototypeLogFile {
  path: string;
  name: string;
  size: number;
  modifiedAt: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  source: string;
}

const LOG_FILES: PrototypeLogFile[] = [
  { path: '/var/log/system.log', name: 'system.log', size: 2_638_922, modifiedAt: '2026-08-05 14:21:35', level: 'INFO', source: 'systemd' },
  { path: '/var/log/controller.log', name: 'controller.log', size: 1_224_874, modifiedAt: '2026-08-05 14:20:18', level: 'INFO', source: '控制器服务' },
  { path: '/var/log/network.log', name: 'network.log', size: 583_221, modifiedAt: '2026-08-05 14:16:04', level: 'WARN', source: '网络服务' },
  { path: '/var/log/exception-20260805.log', name: 'exception-20260805.log', size: 90_116, modifiedAt: '2026-08-05 14:13:52', level: 'ERROR', source: '异常监控' },
  { path: '/var/log/security.log', name: 'security.log', size: 127_440, modifiedAt: '2026-08-05 13:55:20', level: 'WARN', source: '安全服务' },
  { path: '/var/log/kernel.log', name: 'kernel.log', size: 4_481_530, modifiedAt: '2026-08-05 14:21:12', level: 'DEBUG', source: 'kernel' },
];

export async function GetPrototypeLogFiles(kind: PrototypeLogKind): Promise<PrototypeLogFile[]> {
  const files = kind === 'exception'
    ? LOG_FILES.filter((file) => file.level === 'ERROR' || file.level === 'WARN')
    : LOG_FILES;
  return Sleep(Clone(files));
}

export async function GetPrototypeLogPreview(path: string): Promise<string> {
  const file = LOG_FILES.find((item) => item.path === path);
  const title = file?.name || 'unknown.log';
  return Sleep([
    `[2026-08-05 14:21:35.214] INFO  ${title}: 网关服务运行正常`,
    '[2026-08-05 14:21:36.001] INFO  collector: 已采集 16 路控制器状态',
    '[2026-08-05 14:21:37.483] WARN  network: 4G 信号强度低于告警阈值',
    '[2026-08-05 14:21:38.109] INFO  scheduler: 周期任务执行完成',
    '[2026-08-05 14:21:39.622] DEBUG storage: 日志索引已刷新',
  ].join('\n'));
}

export function CreatePrototypeLogLine(kind: 'kernel' | 'system', index: number): string {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  const text = kind === 'kernel'
    ? ['gpio: 控制器输入状态已采样', 'uart: 串口数据帧校验通过', 'net: eth1 链路状态正常'][index % 3]
    : ['设备状态采集完成', '规则引擎完成一次计算', '上报队列已写入最新数据'][index % 3];
  return `${timestamp} ${kind === 'kernel' ? 'kernel' : 'controller'}: ${text}`;
}

export type PrototypeOtaStatus = 'uploading' | 'validating' | 'upgrading' | 'succeeded' | 'failed' | 'cancelled';

export interface PrototypeOtaUpload {
  id: string;
  fileName: string;
  fileSize: number;
  lastModified: number;
  receivedSize: number;
  status: PrototypeOtaStatus;
  error?: string;
  skippedUpload?: boolean;
  startedAt?: number;
  finalPath?: string;
}

const OTA_STORE_KEY = 'ota-upload';

function ReadOtaUpload(): PrototypeOtaUpload | null {
  return ReadStore<PrototypeOtaUpload | null>(OTA_STORE_KEY, null);
}

function SaveOtaUpload(upload: PrototypeOtaUpload | null): void {
  if (upload) {
    WriteStore(OTA_STORE_KEY, upload);
  } else {
    localStorage.removeItem(`${RUNTIME_PREFIX}:${OTA_STORE_KEY}`);
  }
}

function RefreshOtaStatus(upload: PrototypeOtaUpload): PrototypeOtaUpload {
  if (upload.status !== 'validating' && upload.status !== 'upgrading') {
    return upload;
  }
  const elapsed = Date.now() - (upload.startedAt || Date.now());
  if (upload.status === 'validating' && elapsed >= 1_100) {
    return { ...upload, status: 'upgrading', startedAt: Date.now() };
  }
  if (upload.status === 'upgrading' && elapsed >= 7_000) {
    return { ...upload, status: 'succeeded', finalPath: `/data/ota/${upload.fileName}` };
  }
  return upload;
}

export async function CreatePrototypeOtaUpload(file: Pick<PrototypeOtaUpload, 'fileName' | 'fileSize' | 'lastModified'>): Promise<PrototypeOtaUpload> {
  const current = ReadOtaUpload();
  if (current && current.fileName === file.fileName && current.fileSize === file.fileSize && current.lastModified === file.lastModified && current.status !== 'cancelled') {
    return Sleep(RefreshOtaStatus(current));
  }
  const upload: PrototypeOtaUpload = {
    ...file,
    id: NewId('ota'),
    receivedSize: 0,
    status: 'uploading',
  };
  SaveOtaUpload(upload);
  return Sleep(Clone(upload));
}

export async function GetPrototypeOtaUpload(id: string): Promise<PrototypeOtaUpload> {
  const current = ReadOtaUpload();
  if (!current || current.id !== id) {
    throw new Error('未找到固件上传任务');
  }
  const refreshed = RefreshOtaStatus(current);
  SaveOtaUpload(refreshed);
  return Sleep(Clone(refreshed));
}

export async function UploadPrototypeOtaChunk(id: string, size: number): Promise<PrototypeOtaUpload> {
  const current = await GetPrototypeOtaUpload(id);
  if (current.status !== 'uploading') {
    throw new Error('上传任务当前不可继续');
  }
  const next = { ...current, receivedSize: Math.min(current.fileSize, current.receivedSize + size) };
  SaveOtaUpload(next);
  return Sleep(Clone(next), 90);
}

export async function CompletePrototypeOtaUpload(id: string): Promise<PrototypeOtaUpload> {
  const current = await GetPrototypeOtaUpload(id);
  if (current.receivedSize < current.fileSize) {
    throw new Error('固件尚未上传完成');
  }
  const next = { ...current, status: 'validating' as const, startedAt: Date.now() };
  SaveOtaUpload(next);
  return Sleep(Clone(next));
}

export async function CancelPrototypeOtaUpload(id: string): Promise<void> {
  const current = await GetPrototypeOtaUpload(id);
  SaveOtaUpload({ ...current, status: 'cancelled' });
  await Sleep(undefined);
}

export async function RetryPrototypeOtaUpload(id: string): Promise<PrototypeOtaUpload> {
  const current = await GetPrototypeOtaUpload(id);
  const next = { ...current, status: 'upgrading' as const, error: undefined, startedAt: Date.now() };
  SaveOtaUpload(next);
  return Sleep(Clone(next));
}

export type PrototypeNodeMode = 'input' | 'output' | 'analog';

export interface PrototypeDevicePin {
  id: string;
  label: string;
  capabilities: string[];
}

export interface PrototypeBoard {
  id: string;
  name: string;
  pins: PrototypeDevicePin[];
}

export interface PrototypeDeviceNode {
  id: string;
  name: string;
  description: string;
  boardId: string;
  pinId: string;
  mode: PrototypeNodeMode;
  parameters: Record<string, string>;
  updatedAt: string;
  lastTest?: { status: 'success' | 'error' | 'unsupported'; message: string; testedAt: string };
}

export interface PrototypeNodeDraft {
  name: string;
  description: string;
  boardId: string;
  pinId: string;
  mode: PrototypeNodeMode;
  parameters: Record<string, string>;
}

export interface PrototypeFlowProposal {
  id: string;
  mode: 'flow' | 'node-instance' | 'node-module';
  summary: string;
  assistantMessage: string;
  nodeCount: number;
  connectionCount: number;
  targetDirectory?: string;
  files?: string[];
}

const BOARDS: PrototypeBoard[] = [
  { id: 'controller', name: 'CT16 主控制器', pins: [{ id: 'DI1', label: '数字输入 DI1', capabilities: ['input'] }, { id: 'DO1', label: '数字输出 DO1', capabilities: ['output'] }, { id: 'AI1', label: '模拟输入 AI1', capabilities: ['analog'] }] },
  { id: 'expansion', name: '扩展 I/O 模块', pins: [{ id: 'X1', label: '扩展输入 X1', capabilities: ['input'] }, { id: 'Y1', label: '扩展输出 Y1', capabilities: ['output'] }] },
];

const NODE_STORE_KEY = 'device-nodes';

function ReadNodes(): PrototypeDeviceNode[] {
  return ReadStore<PrototypeDeviceNode[]>(NODE_STORE_KEY, [
    { id: 'node-temperature', name: '温湿度采集', description: '读取环境温湿度并发送到流程上下文。', boardId: 'controller', pinId: 'AI1', mode: 'analog', parameters: { interval: '30s' }, updatedAt: '2026-08-05T13:20:00+08:00' },
    { id: 'node-alarm', name: '告警灯控制', description: '控制设备告警指示灯的数字输出。', boardId: 'controller', pinId: 'DO1', mode: 'output', parameters: { initialValue: '0' }, updatedAt: '2026-08-05T13:10:00+08:00' },
  ]);
}

export async function GetPrototypeBoards(): Promise<PrototypeBoard[]> {
  return Sleep(Clone(BOARDS));
}

export async function GetPrototypeDeviceNodes(): Promise<PrototypeDeviceNode[]> {
  return Sleep(ReadNodes());
}

export async function SavePrototypeDeviceNode(id: string | null, draft: PrototypeNodeDraft): Promise<PrototypeDeviceNode> {
  const nodes = ReadNodes();
  const saved: PrototypeDeviceNode = {
    ...draft,
    id: id || NewId('node'),
    updatedAt: new Date().toISOString(),
  };
  const next = id ? nodes.map((node) => node.id === id ? { ...saved, lastTest: node.lastTest } : node) : [...nodes, saved];
  WriteStore(NODE_STORE_KEY, next);
  return Sleep(Clone(saved));
}

export async function DeletePrototypeDeviceNode(id: string): Promise<void> {
  WriteStore(NODE_STORE_KEY, ReadNodes().filter((node) => node.id !== id));
  await Sleep(undefined);
}

export async function TestPrototypeDeviceNode(id: string): Promise<PrototypeDeviceNode> {
  const nodes = ReadNodes();
  const node = nodes.find((item) => item.id === id);
  if (!node) {
    throw new Error('未找到设备节点');
  }
  const lastTest = {
    status: 'success' as const,
    message: node.mode === 'output' ? `已模拟写入 ${node.pinId}` : `已模拟读取 ${node.pinId}：状态正常`,
    testedAt: new Date().toISOString(),
  };
  const next = nodes.map((item) => item.id === id ? { ...item, lastTest, updatedAt: new Date().toISOString() } : item);
  WriteStore(NODE_STORE_KEY, next);
  return Sleep(Clone(next.find((item) => item.id === id)!));
}

export async function CreatePrototypeNodeDraft(prompt: string, boards: PrototypeBoard[]): Promise<PrototypeNodeDraft> {
  const output = /输出|控制|开关|告警灯/.test(prompt);
  const analog = /温度|湿度|模拟|采集/.test(prompt);
  const board = boards[0] || BOARDS[0];
  const mode: PrototypeNodeMode = analog ? 'analog' : output ? 'output' : 'input';
  const pin = board.pins.find((item) => item.capabilities.includes(mode)) || board.pins[0];
  return Sleep({
    name: output ? '自动生成的控制节点' : analog ? '自动生成的采集节点' : '自动生成的输入节点',
    description: prompt || '由原型助手生成的设备节点配置。',
    boardId: board.id,
    pinId: pin.id,
    mode,
    parameters: mode === 'analog' ? { interval: '30s' } : { initialValue: '0' },
  });
}

export async function CreatePrototypeFlowProposal(prompt: string): Promise<PrototypeFlowProposal> {
  const module = /模块|封装/.test(prompt);
  const node = !module && /节点|GPIO|引脚/.test(prompt);
  const mode = module ? 'node-module' : node ? 'node-instance' : 'flow';
  return Sleep({
    id: NewId('proposal'),
    mode,
    summary: prompt || '根据当前设备状态采集并生成自动化流程。',
    assistantMessage: mode === 'node-module'
      ? '已生成节点模块保存提案。确认后仅保存到原型目录，不安装、不加载、不重启。'
      : '已生成流程提案，请检查摘要并确认后应用。',
    nodeCount: mode === 'flow' ? 4 : 1,
    connectionCount: mode === 'flow' ? 3 : 0,
    targetDirectory: mode === 'node-module' ? '/data/node-red/modules' : undefined,
    files: mode === 'node-module' ? ['ct16-generated-node.js', 'package.json'] : undefined,
  });
}

export async function ApplyPrototypeFlowProposal(proposal: PrototypeFlowProposal): Promise<{ message: string }> {
  WriteStore('last-flow-proposal', { ...proposal, appliedAt: new Date().toISOString() });
  return Sleep({ message: proposal.mode === 'node-module' ? '节点模块已保存到原型目录，未安装或加载。' : '流程提案已应用到原型工作区。' });
}

export interface PrototypeModel {
  id: string;
  name: string;
  provider: string;
  apiBase: string;
  isDefault: boolean;
  available: boolean;
  apiKey: string;
}

export interface PrototypeSkill {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  enabled: boolean;
  system: boolean;
}

const MODEL_STORE_KEY = 'agent-models';
const SKILL_STORE_KEY = 'agent-skills';

function ReadModels(): PrototypeModel[] {
  return ReadStore<PrototypeModel[]>(MODEL_STORE_KEY, [
    { id: 'tinyllm', name: 'TinyLLM-1B', provider: '本地模型', apiBase: 'http://127.0.0.1:11434/v1', isDefault: true, available: true, apiKey: '' },
    { id: 'qwen', name: 'Qwen3-8B', provider: '本地模型', apiBase: 'http://127.0.0.1:11434/v1', isDefault: false, available: true, apiKey: '' },
  ]);
}

function ReadSkills(): PrototypeSkill[] {
  return ReadStore<PrototypeSkill[]>(SKILL_STORE_KEY, MOCK_SKILLS.map((skill) => ({ id: skill.id, name: skill.name, version: skill.version, description: skill.description, category: skill.category, enabled: skill.status === 'enabled', system: skill.id === 'skill-1' })));
}

export async function GetPrototypeModels(): Promise<PrototypeModel[]> {
  return Sleep(ReadModels());
}

export async function SavePrototypeModel(model: Omit<PrototypeModel, 'id' | 'isDefault' | 'available'> & { id?: string }): Promise<PrototypeModel> {
  const models = ReadModels();
  const saved: PrototypeModel = {
    ...model,
    id: model.id || NewId('model'),
    isDefault: model.id ? models.find((item) => item.id === model.id)?.isDefault || false : models.length === 0,
    available: true,
  };
  WriteStore(MODEL_STORE_KEY, model.id ? models.map((item) => item.id === model.id ? saved : item) : [...models, saved]);
  return Sleep(Clone(saved));
}

export async function DeletePrototypeModel(id: string): Promise<void> {
  const models = ReadModels();
  if (models.find((item) => item.id === id)?.isDefault) {
    throw new Error('默认模型不可删除，请先切换默认模型');
  }
  WriteStore(MODEL_STORE_KEY, models.filter((item) => item.id !== id));
  await Sleep(undefined);
}

export async function SetPrototypeDefaultModel(id: string): Promise<void> {
  const models = ReadModels();
  if (!models.some((item) => item.id === id)) {
    throw new Error('未找到模型配置');
  }
  WriteStore(MODEL_STORE_KEY, models.map((item) => ({ ...item, isDefault: item.id === id })));
  await Sleep(undefined, 420);
}

export async function TestPrototypeModel(id: string): Promise<{ latency: number; message: string }> {
  const model = ReadModels().find((item) => item.id === id);
  if (!model) {
    throw new Error('未找到模型配置');
  }
  return Sleep({ latency: 86, message: `已模拟完成 ${model.name} 连通性测试` }, 520);
}

export async function GetPrototypeSkills(): Promise<PrototypeSkill[]> {
  return Sleep(ReadSkills());
}

export async function SetPrototypeSkillEnabled(id: string, enabled: boolean): Promise<void> {
  WriteStore(SKILL_STORE_KEY, ReadSkills().map((skill) => skill.id === id ? { ...skill, enabled } : skill));
  await Sleep(undefined);
}

export async function ImportPrototypeSkill(id: string): Promise<PrototypeSkill> {
  const source = MOCK_MARKET_SKILLS.find((skill) => skill.id === id);
  if (!source) {
    throw new Error('未找到可导入技能');
  }
  const skill: PrototypeSkill = { id: NewId('skill'), name: source.name, version: source.version, description: source.description, category: source.category, enabled: true, system: false };
  WriteStore(SKILL_STORE_KEY, [...ReadSkills(), skill]);
  return Sleep(Clone(skill));
}

export async function DeletePrototypeSkill(id: string): Promise<void> {
  const skill = ReadSkills().find((item) => item.id === id);
  if (skill?.system) {
    throw new Error('系统技能不可删除');
  }
  WriteStore(SKILL_STORE_KEY, ReadSkills().filter((item) => item.id !== id));
  await Sleep(undefined);
}

export function GetPrototypeMarketplaceSkills(): PrototypeSkill[] {
  return MOCK_MARKET_SKILLS.map((skill) => ({ id: skill.id, name: skill.name, version: skill.version, description: skill.description, category: skill.category, enabled: false, system: false }));
}

export interface PrototypeTimeSettings {
  timezone: string;
  ntpServer: string;
}

export interface PrototypeServiceStatus {
  sshd: boolean;
  hdcd: boolean;
}

export interface PrototypeAppearance {
  systemName: string;
  logoType: string;
  logoImage: string;
}

const TIME_SETTINGS_STORE_KEY = 'time-settings';
const SERVICE_STATUS_STORE_KEY = 'service-status';
const APPEARANCE_STORE_KEY = 'appearance';
const PROTOTYPE_TIMEZONES = [
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

function ReadPrototypeCredentials(): { username: string; password: string } | null {
  try {
    const stored = localStorage.getItem('zaihong:credentials');
    if (!stored) {
      return null;
    }
    const credentials = JSON.parse(stored) as { username?: unknown; password?: unknown };
    if (typeof credentials.username !== 'string' || typeof credentials.password !== 'string') {
      return null;
    }
    return { username: credentials.username, password: credentials.password };
  } catch {
    return null;
  }
}

export async function GetPrototypeTimezones(): Promise<string[]> {
  return Sleep(Clone(PROTOTYPE_TIMEZONES));
}

export async function GetPrototypeTimeSettings(): Promise<PrototypeTimeSettings> {
  return Sleep(ReadStore<PrototypeTimeSettings>(TIME_SETTINGS_STORE_KEY, {
    timezone: 'Asia/Shanghai',
    ntpServer: 'ntp.aliyun.com',
  }));
}

export async function SavePrototypeTimeSettings(settings: PrototypeTimeSettings): Promise<void> {
  if (!settings.timezone || !settings.ntpServer.trim()) {
    throw new Error('请填写时区和 NTP 服务器');
  }
  WriteStore(TIME_SETTINGS_STORE_KEY, {
    timezone: settings.timezone,
    ntpServer: settings.ntpServer.trim(),
  });
  await Sleep(undefined, 360);
}

export async function GetPrototypeServiceStatus(): Promise<PrototypeServiceStatus> {
  return Sleep(ReadStore<PrototypeServiceStatus>(SERVICE_STATUS_STORE_KEY, { sshd: true, hdcd: true }));
}

export async function VerifyPrototypeAdminPassword(password: string): Promise<void> {
  const credentials = ReadPrototypeCredentials();
  if (!credentials || credentials.password !== password) {
    throw new Error('管理员密码不正确');
  }
  await Sleep(undefined, 220);
}

export async function SetPrototypeServiceStatus(service: keyof PrototypeServiceStatus, enabled: boolean): Promise<PrototypeServiceStatus> {
  const current = ReadStore<PrototypeServiceStatus>(SERVICE_STATUS_STORE_KEY, { sshd: true, hdcd: true });
  const next = { ...current, [service]: enabled };
  WriteStore(SERVICE_STATUS_STORE_KEY, next);
  return Sleep(next, 520);
}

export async function GetPrototypeAppearance(): Promise<PrototypeAppearance> {
  const fallback: PrototypeAppearance = {
    systemName: localStorage.getItem('zaihong:systemName') || '在鸿设备管理系统',
    logoType: localStorage.getItem('zaihong:logoType') || 'chip',
    logoImage: localStorage.getItem('zaihong:logoImage') || '',
  };
  return Sleep(ReadStore<PrototypeAppearance>(APPEARANCE_STORE_KEY, fallback));
}

export async function SavePrototypeAppearance(appearance: PrototypeAppearance): Promise<PrototypeAppearance> {
  if (!appearance.systemName.trim()) {
    throw new Error('系统名称不能为空');
  }
  const next = {
    systemName: appearance.systemName.trim(),
    logoType: appearance.logoType,
    logoImage: appearance.logoImage,
  };
  WriteStore(APPEARANCE_STORE_KEY, next);
  localStorage.setItem('zaihong:systemName', next.systemName);
  localStorage.setItem('zaihong:logoType', next.logoType);
  localStorage.setItem('zaihong:logoImage', next.logoImage);
  window.dispatchEvent(new Event('zaihong:appearance-changed'));
  return Sleep(Clone(next), 360);
}

export async function ChangePrototypeAdminPassword(currentPassword: string, nextPassword: string): Promise<void> {
  if (nextPassword.length < 4) {
    throw new Error('新密码至少需要 4 个字符');
  }
  await VerifyPrototypeAdminPassword(currentPassword);
  const credentials = ReadPrototypeCredentials();
  if (!credentials) {
    throw new Error('未找到原型管理员账号');
  }
  localStorage.setItem('zaihong:credentials', JSON.stringify({ ...credentials, password: nextPassword }));
  await Sleep(undefined, 360);
}
