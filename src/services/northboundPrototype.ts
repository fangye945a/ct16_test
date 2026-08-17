/*
 * Copyright (c) 2026 Hunan OpenValley Digital Industry Development Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type NorthboundProtocol = 'mqtt' | 'http' | 'opcua';
export type NorthboundConnectionStatus = 'connected' | 'disconnected' | 'testing';

export interface INorthboundProtocolPlugin {
  id: NorthboundProtocol;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  enabled: boolean;
}

export interface INorthboundPlatform {
  id: string;
  name: string;
  protocol: NorthboundProtocol;
  endpoint: string;
  username: string;
  secret: string;
  reportInterval: number;
  enabled: boolean;
  status: NorthboundConnectionStatus;
  lastConnectedAt: string;
  config: Record<string, string>;
}

export interface INorthboundPlatformDraft {
  name: string;
  protocol: NorthboundProtocol;
  endpoint: string;
  username: string;
  secret: string;
  reportInterval: number;
  enabled: boolean;
  config: Record<string, string>;
}

export interface INorthboundTelemetryPoint {
  timestamp: string;
  platformId: string;
  platformName: string;
  deviceName: string;
  dataPoint: string;
  value: number;
  unit: string;
  success: boolean;
}

const PLATFORM_STORAGE_KEY = 'zaihong:northbound-platforms';
const PLUGIN_STORAGE_KEY = 'zaihong:northbound-plugins';

const INITIAL_PLUGINS: INorthboundProtocolPlugin[] = [
  {
    id: 'mqtt',
    name: 'MQTT',
    version: '2.1.0',
    description: '面向物联网云平台的轻量消息上报与指令订阅协议。',
    capabilities: ['TLS 加密', 'QoS 0/1/2', '主题映射', '断线重连'],
    enabled: true,
  },
  {
    id: 'http',
    name: 'HTTP',
    version: '1.4.2',
    description: '通过 HTTPS REST 接口批量推送设备数据。',
    capabilities: ['HTTPS', '批量 POST', 'Header 鉴权', '失败重试'],
    enabled: true,
  },
  {
    id: 'opcua',
    name: 'OPC UA',
    version: '1.8.0',
    description: '面向工业平台的安全节点映射与订阅接入协议。',
    capabilities: ['安全策略', '节点映射', '订阅模式', '证书认证'],
    enabled: true,
  },
];

const INITIAL_PLATFORMS: INorthboundPlatform[] = [
  {
    id: 'north-platform-1',
    name: '生产数据中心',
    protocol: 'mqtt',
    endpoint: 'mqtts://iot.example.com:8883',
    username: 'ct16_gateway',
    secret: 'prototype-token',
    reportInterval: 5,
    enabled: true,
    status: 'connected',
    lastConnectedAt: '2026-08-17 09:42:18',
    config: { publishTopic: 'factory/ct16/telemetry', qos: '1', clientId: 'CT16-MASTER-01' },
  },
  {
    id: 'north-platform-2',
    name: '运维开放平台',
    protocol: 'http',
    endpoint: 'https://ops.example.com/api/v1/telemetry',
    username: 'gateway-api',
    secret: 'prototype-api-key',
    reportInterval: 30,
    enabled: true,
    status: 'connected',
    lastConnectedAt: '2026-08-17 09:41:55',
    config: { method: 'POST', authHeader: 'X-API-Key', batchSize: '50' },
  },
  {
    id: 'north-platform-3',
    name: '车间 SCADA',
    protocol: 'opcua',
    endpoint: 'opc.tcp://192.168.1.200:4840',
    username: 'ct16-opc',
    secret: 'prototype-password',
    reportInterval: 10,
    enabled: false,
    status: 'disconnected',
    lastConnectedAt: '2026-08-16 18:20:04',
    config: { securityPolicy: 'Basic256Sha256', namespace: 'urn:ct16:devices', mode: 'SignAndEncrypt' },
  },
];

function Clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ReadArray<T>(key: string, fallback: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? (parsed as T[]) : Clone(fallback);
  } catch {
    return Clone(fallback);
  }
}

function SavePlatforms(platforms: INorthboundPlatform[]): void {
  localStorage.setItem(PLATFORM_STORAGE_KEY, JSON.stringify(platforms));
}

function Wait(delay = 260): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

/**
 * 获取北向协议插件列表。
 *
 * @returns 当前协议插件及启用状态
 */
export async function GetNorthboundPlugins(): Promise<INorthboundProtocolPlugin[]> {
  await Wait(120);
  return ReadArray(PLUGIN_STORAGE_KEY, INITIAL_PLUGINS);
}

/**
 * 更新北向协议插件启用状态。
 *
 * @param protocol 协议插件标识
 * @param enabled 是否启用插件
 * @returns 更新后的协议插件列表
 */
export async function SetNorthboundPluginEnabled(protocol: NorthboundProtocol, enabled: boolean): Promise<INorthboundProtocolPlugin[]> {
  const plugins = ReadArray(PLUGIN_STORAGE_KEY, INITIAL_PLUGINS).map((plugin) => (plugin.id === protocol ? { ...plugin, enabled } : plugin));
  localStorage.setItem(PLUGIN_STORAGE_KEY, JSON.stringify(plugins));
  await Wait();
  return Clone(plugins);
}

/**
 * 获取北向平台连接列表。
 *
 * @returns 已保存的平台连接配置
 */
export async function GetNorthboundPlatforms(): Promise<INorthboundPlatform[]> {
  await Wait(160);
  return ReadArray(PLATFORM_STORAGE_KEY, INITIAL_PLATFORMS);
}

/**
 * 新增或更新北向平台连接。
 *
 * @param id 待更新的平台标识，新增时传入空值
 * @param draft 平台连接表单数据
 * @returns 保存后的平台连接
 */
export async function SaveNorthboundPlatform(id: string | null, draft: INorthboundPlatformDraft): Promise<INorthboundPlatform> {
  const platforms = ReadArray(PLATFORM_STORAGE_KEY, INITIAL_PLATFORMS);
  const current = platforms.find((platform) => platform.id === id);
  const next: INorthboundPlatform = {
    ...draft,
    id: current?.id || `north-platform-${Date.now()}`,
    status: draft.enabled ? current?.status || 'disconnected' : 'disconnected',
    lastConnectedAt: current?.lastConnectedAt || '尚未连接',
  };
  SavePlatforms(current ? platforms.map((platform) => (platform.id === id ? next : platform)) : [next, ...platforms]);
  await Wait();
  return Clone(next);
}

/**
 * 删除北向平台连接。
 *
 * @param id 平台连接标识
 */
export async function DeleteNorthboundPlatform(id: string): Promise<void> {
  SavePlatforms(ReadArray(PLATFORM_STORAGE_KEY, INITIAL_PLATFORMS).filter((platform) => platform.id !== id));
  await Wait();
}

/**
 * 模拟测试北向平台连接。
 *
 * @param id 平台连接标识
 * @returns 更新连接状态后的平台配置
 */
export async function TestNorthboundPlatform(id: string): Promise<INorthboundPlatform> {
  const platforms = ReadArray(PLATFORM_STORAGE_KEY, INITIAL_PLATFORMS);
  const current = platforms.find((platform) => platform.id === id);
  if (!current) {
    throw new Error('未找到北向平台配置');
  }
  await Wait(700);
  if (/invalid|offline/i.test(current.endpoint)) {
    const failed = { ...current, status: 'disconnected' as const };
    SavePlatforms(platforms.map((platform) => (platform.id === id ? failed : platform)));
    throw new Error('连接测试失败，请检查服务地址和认证信息');
  }
  const connected = {
    ...current,
    status: 'connected' as const,
    lastConnectedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
  };
  SavePlatforms(platforms.map((platform) => (platform.id === id ? connected : platform)));
  return Clone(connected);
}

/**
 * 更新北向平台启用状态。
 *
 * @param id 平台连接标识
 * @param enabled 是否启用连接
 * @returns 更新后的平台连接
 */
export async function SetNorthboundPlatformEnabled(id: string, enabled: boolean): Promise<INorthboundPlatform> {
  const platforms = ReadArray(PLATFORM_STORAGE_KEY, INITIAL_PLATFORMS);
  const current = platforms.find((platform) => platform.id === id);
  if (!current) {
    throw new Error('未找到北向平台配置');
  }
  const next = { ...current, enabled, status: enabled ? current.status : ('disconnected' as NorthboundConnectionStatus) };
  SavePlatforms(platforms.map((platform) => (platform.id === id ? next : platform)));
  await Wait();
  return Clone(next);
}

/**
 * 生成北向平台遥测上报原型数据。
 *
 * @param platforms 当前平台连接列表
 * @returns 可视化展示使用的遥测记录
 */
export async function GetNorthboundTelemetry(platforms: INorthboundPlatform[]): Promise<INorthboundTelemetryPoint[]> {
  await Wait(180);
  const activePlatforms = platforms.filter((platform) => platform.enabled);
  const devices = [
    { name: '能见度仪-01', point: '一氧化碳浓度', base: 18, unit: 'ppm' },
    { name: '亮度计-01', point: '洞外亮度', base: 420, unit: 'cd/m2' },
    { name: '卷帘门-01', point: '开度', base: 86, unit: '%' },
  ];
  const now = Date.now();
  const points: INorthboundTelemetryPoint[] = [];
  activePlatforms.forEach((platform, platformIndex) => {
    for (let index = 23; index >= 0; index -= 1) {
      const device = devices[(index + platformIndex) % devices.length];
      const variation = Math.sin((index + platformIndex) / 3) * device.base * 0.08 + ((index * 7) % 5);
      points.push({
        timestamp: new Date(now - index * 5 * 60_000).toISOString(),
        platformId: platform.id,
        platformName: platform.name,
        deviceName: device.name,
        dataPoint: device.point,
        value: Math.round((device.base + variation) * 10) / 10,
        unit: device.unit,
        success: (index + platformIndex) % 17 !== 0,
      });
    }
  });
  return points;
}
