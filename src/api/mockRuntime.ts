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

import { MOCK_ALERT_EVENTS, MOCK_SYSTEM_INFO, MOCK_SYSTEM_METRICS } from '@/data/dashboard';
import { MOCK_DEVICE_MODELS } from '@/data/device-models';
import { MOCK_DEVICE_NODES, MOCK_MODULE_SLOTS, MOCK_NETWORK_DEVICES } from '@/data/topology';

const MOCK_TOKEN = 'ct16-mock-session';
const MOCK_OTA_UPLOADS = new Map<string, Record<string, unknown>>();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function overview() {
  return {
    device: {
      deviceName: MOCK_SYSTEM_INFO.deviceName,
      model: MOCK_SYSTEM_INFO.model,
      serialNumber: MOCK_SYSTEM_INFO.serialNumber,
      systemVersion: MOCK_SYSTEM_INFO.systemVersion,
      firmwareVersion: MOCK_SYSTEM_INFO.firmwareVersion,
    },
    status: {
      overallStatus: MOCK_SYSTEM_METRICS.overallStatus,
      statusMessage: '系统运行正常',
      uptimeSeconds: Math.floor((Date.now() - Date.parse(MOCK_SYSTEM_INFO.startedAt)) / 1000),
      sampledAt: new Date().toISOString(),
    },
    metrics: {
      cpuUsage: MOCK_SYSTEM_METRICS.cpuUsage,
      memoryUsage: MOCK_SYSTEM_METRICS.memoryUsage,
      diskUsage: MOCK_SYSTEM_METRICS.diskUsage,
      networkInMbps: MOCK_SYSTEM_METRICS.networkIn,
      networkOutMbps: MOCK_SYSTEM_METRICS.networkOut,
    },
    trends: {
      cpu: MOCK_SYSTEM_METRICS.cpuTrend,
      memory: MOCK_SYSTEM_METRICS.memoryTrend,
      disk: MOCK_SYSTEM_METRICS.diskTrend,
      network: MOCK_SYSTEM_METRICS.networkTrend,
    },
    alerts: MOCK_ALERT_EVENTS.map((item) => ({ ...item, active: true })),
  };
}

function models() {
  return {
    models: MOCK_DEVICE_MODELS.map((model) => ({
      schemaVersion: 1,
      id: model.id,
      pluginFile: model.sourceFile || `${model.id}.json`,
      modelName: model.name,
      deviceType: model.type,
      deviceVendor: model.vendor || 'OpenValley',
      deviceModel: model.deviceModel || model.name,
      version: model.version,
      description: model.description,
      protocolDescription: '模拟设备模型接口',
      interfaces: (model.interfaces || []).map((item) => ({
        name: item.name,
        id: item.identifier,
        type: item.type,
        defaultConfigJSON: JSON.stringify(item.defaultConfig),
        description: item.description,
        requiresDeviceAddress: false,
      })),
      statuses: (model.statusDataPoints || model.dataPoints).map((item) => ({
        id: item.id,
        name: item.name,
        dataType: item.dataType,
        isEnum: item.dataType === 'enum',
        required: false,
        unit: item.unit,
        minimum: '',
        maximum: '',
        step: '',
        description: item.description,
        exampleJSON: JSON.stringify(0),
        values: [],
      })),
      controls: (model.controlDataPoints || []).map((item) => ({
        id: item.id,
        name: item.name,
        dataType: item.dataType,
        isEnum: item.dataType === 'enum',
        required: false,
        unit: item.unit,
        minimum: '',
        maximum: '',
        step: '',
        description: item.description,
        exampleJSON: JSON.stringify(0),
        values: [],
      })),
      applicableScenarios: model.applicableScenarios || [],
      createdAt: model.createdAt,
      syncStatus: model.status,
      tags: model.tags,
      iconId: '',
      iconUrl: '',
    })),
    types: [...new Set(MOCK_DEVICE_MODELS.map((model) => model.type))],
    warnings: [],
  };
}

function modules() {
  const items = MOCK_MODULE_SLOTS.filter((item) => item.status !== 'empty').map((item, index) => ({
    groupIndex: item.slotNumber,
    moduleId: index + 1,
    moduleType: index + 1,
    displayName: item.name,
    category: item.type,
    configStatus: 0,
    errCode: 0,
    canIdUp: 0,
    canIdDown: 0,
    isOnline: item.status !== 'fault',
    version: item.version,
    portStatus: 0,
    funcMask: 0,
    adcValue: item.adcValue,
    channelCount: item.channels,
    ports: item.channelList.map((channel) => ({
      index: channel.index,
      label: channel.label,
      direction: 'io',
      value: channel.value,
      unit: channel.unit,
      status: channel.status,
    })),
  }));
  return { modules: items, totalCount: items.length, onlineCount: items.filter((item) => item.isOnline).length };
}

function deviceInstances() {
  return {
    instances: MOCK_DEVICE_NODES.slice(0, 6).map((item) => ({
      name: item.name,
      sn: item.serialNumber,
      type: item.deviceType,
      vendor: 'OpenValley',
      model: item.modelName || item.deviceType,
      devPoint: item.address,
      remark: item.description,
      interfaceConfigs: { [item.interfaceType]: [item.address] },
      interfaceTypes: { [item.interfaceType]: item.interfaceType },
    })),
  };
}

function cloudEndpoint(host: string, port: number) {
  return { host, port, username: 'mock-user', passwordConfigured: true };
}

function cloudConnection() {
  return {
    id: 'mock-cloud-1',
    name: '模拟云平台',
    runtime: { state: 'connected', activeEndpoint: 'primary', activeHost: 'mock-cloud.local', activePort: 1883, lastError: '' },
    provider: 'standard_mqtt',
    config: {
      enabled: true,
      cloudType: 'standard_mqtt',
      clientId: 'ct16-mock-client',
      topicPrefix: 'ct16/mock',
      keepaliveSec: 60,
      qos: 1,
      reportIntervalSec: 30,
      primary: cloudEndpoint('mock-cloud.local', 1883),
      backup: cloudEndpoint('mock-cloud-backup.local', 1883),
      tls: { enabled: false },
    },
  };
}

function otaStatus(id: string, overrides: Record<string, unknown> = {}) {
  const current = MOCK_OTA_UPLOADS.get(id) || {};
  return {
    id,
    fileName: current.fileName || 'ct16-firmware.img',
    fileSize: current.fileSize || 0,
    lastModified: current.lastModified || Date.now(),
    receivedSize: current.receivedSize || 0,
    status: current.status || 'uploading',
    skippedUpload: false,
    createdAt: current.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...current,
    ...overrides,
  };
}

function routeResponse(pathname: string, method: string, body: unknown, headers: Headers): Response {
  if (pathname === '/api/auth/login' && method === 'POST') {
    return jsonResponse({ token: MOCK_TOKEN, expiresAt: Date.now() + 86400000 });
  }
  if (pathname === '/api/auth/status') {
    return jsonResponse({ isLoggedIn: true, isSetup: true });
  }
  if (pathname === '/api/system/overview') return jsonResponse(overview());
  if (pathname === '/api/system/alerts') return jsonResponse({ alerts: overview().alerts, total: overview().alerts.length });
  if (pathname === '/api/system/appearance') return jsonResponse({ systemName: 'CT16 设备管理平台', logoType: 'chip', logoImage: '' });
  if (pathname === '/api/settings/time') return jsonResponse({ timezone: 'Asia/Shanghai', ntpServer: 'ntp.aliyun.com', ntpEnabled: true, systemTime: new Date().toISOString() });
  if (pathname === '/api/settings/timezones') return jsonResponse({ timezones: ['Asia/Shanghai', 'Asia/Tokyo', 'UTC'], offsets: { 'Asia/Shanghai': 8, 'Asia/Tokyo': 9, UTC: 0 } });
  if (pathname === '/api/settings/network') return jsonResponse({ global: { netMode: 'dhcp', dnsServers: '223.5.5.5', brMembers: '' }, interfaces: {} });
  if (pathname === '/api/settings/wireless/modules') return jsonResponse({ slot1: 'wifi', slot2: 'ble' });
  if (pathname.includes('/api/settings/wireless/interfaces/')) return jsonResponse({ id: 'wifi', name: '无线网卡', enabled: true, addressMode: 'auto', ipAddress: '192.168.1.10', subnetMask: '255.255.255.0', gateway: '192.168.1.1', dnsPrimary: '223.5.5.5', dnsSecondary: '114.114.114.114', metric: '100', defaultRoute: true, ssid: 'CT16-Mock', encryption: 'WPA2' });
  if (pathname.includes('/api/settings/wireless')) return jsonResponse({ slot1: 'wifi', slot2: 'ble' });
  if (pathname === '/api/services/status') return jsonResponse({ sshd: true, hdcd: true });
  if (pathname === '/api/settings/esoftbus') return jsonResponse({ master: 1, deviceId: 'CT16-MOCK-0001', deviceName: 'CT16 模拟控制器', plugCfgDir: '/userdata/esoftbus/plug/', hardwareCfgFile: '/userdata/esoftbus/hw.cfg', dbRootPath: '/niobe470/devDB', regionName: 'region0', interfaces: { eth0: 'eth0', eth1: '' }, configPath: '/userdata/esoftbus/esoftbus/esoftbus.cfg', hardwareConfigPath: '/userdata/esoftbus/hw.cfg' });
  if (pathname === '/api/topology/modules') return jsonResponse(modules());
  if (pathname === '/api/topology/wireless-modules') return jsonResponse({ slot1: { type: 'wifi', ipAddress: '192.168.1.10', signalStrength: '-48 dBm', broadcastName: 'CT16-Mock', macAddress: '02:16:00:00:00:01', version: '1.0.0' }, slot2: { type: 'ble', version: '1.0.0' } });
  if (pathname === '/api/topology/network/devices') return jsonResponse({ devices: MOCK_NETWORK_DEVICES.map((item) => ({ devId: item.id, devName: item.name, devVersion: item.firmware, deviceType: item.deviceType, onlineStatus: item.status === 'online', role: item.role, isLocal: item.role === 'master' })), totalCount: MOCK_NETWORK_DEVICES.length, onlineCount: MOCK_NETWORK_DEVICES.filter((item) => item.status === 'online').length });
  if (pathname === '/api/topology/network/custom-devices') return jsonResponse({ devices: [], totalCount: 0, onlineCount: 0 });
  if (pathname === '/api/device-models') return jsonResponse(models());
  if (pathname.match(/^\/api\/device-models\/[^/]+\/interfaces$/)) {
    const id = pathname.split('/')[3];
    const model = models().models.find((item) => item.id === id) || models().models[0];
    return jsonResponse({ interfaces: model?.interfaces || [] });
  }
  if (pathname === '/api/device-instances/batch') return jsonResponse({ results: [] });
  if (pathname === '/api/device-instances') return jsonResponse(deviceInstances());
  if (pathname.startsWith('/api/device-instances/')) return jsonResponse({ success: true, code: 0, info: '模拟设备操作成功' });
  if (pathname === '/api/nodes') return jsonResponse({ nodes: [] });
  if (pathname.endsWith('/pins')) return jsonResponse({ pins: [] });
  if (pathname.startsWith('/api/nodes/')) return jsonResponse({ node: null, files: { html: '', js: '' } }, 404);
  if (pathname === '/api/models') return jsonResponse({ models: [], total: 0, default_model: '', provider_options: [] });
  if (pathname === '/api/skills') return jsonResponse({ skills: [], total: 0 });
  if (pathname === '/api/config') return jsonResponse({ agents: { defaults: { max_tokens: 32768 } } });
  if (pathname === '/api/gateway/status') return jsonResponse({ gateway_status: 'running', gateway_start_allowed: true, gateway_restart_required: false, pid: 1600, boot_default_model: '', config_default_model: '' });
  if (pathname === '/api/cloud/providers' || pathname === '/api/cloud/plugins') return jsonResponse([{ id: 'standard_mqtt', displayName: '标准 MQTT', available: true, capabilities: 0, source: 'builtin', path: '', fileName: '', size: 0, modifiedMs: 0, activeInstances: 1 }]);
  if (pathname === '/api/cloud/connections') return jsonResponse({ connections: [{ id: 'mock-cloud-1', name: '模拟云平台', provider: 'standard_mqtt', enabled: true, state: 'connected', lastConnectedAtMs: Date.now(), lastError: '' }], maxCount: 4 });
  if (pathname === '/api/cloud/connections/mock-cloud-1') return jsonResponse(cloudConnection());
  if (pathname.includes('/mqtt-records')) return jsonResponse({ records: [], nextCursor: 0, hasMore: false, total: 0, droppedCount: 0 });
  if (pathname === '/api/ota/uploads' && method === 'POST') {
    const data = (body || {}) as Record<string, unknown>;
    const id = `mock-ota-${Date.now()}`;
    MOCK_OTA_UPLOADS.set(id, { fileName: data.fileName, fileSize: data.fileSize, lastModified: data.lastModified, status: 'uploading', receivedSize: 0 });
    return jsonResponse(otaStatus(id));
  }
  if (pathname.match(/^\/api\/ota\/uploads\/[^/]+\/content$/) && method === 'PUT') {
    const id = pathname.split('/')[4];
    const range = headers.get('Content-Range')?.match(/bytes \d+-\d+\/(\d+)/);
    const total = range ? Number(range[1]) : 0;
    MOCK_OTA_UPLOADS.set(id, { ...MOCK_OTA_UPLOADS.get(id), receivedSize: total });
    return jsonResponse(otaStatus(id));
  }
  if (pathname.match(/^\/api\/ota\/(uploads|jobs)\/[^/]+$/)) {
    const id = pathname.split('/')[4];
    if (method === 'DELETE') return jsonResponse({ status: 'ok' });
    return jsonResponse(otaStatus(id, pathname.includes('/jobs/') ? { status: 'succeeded', receivedSize: otaStatus(id).fileSize } : {}));
  }
  if (pathname.match(/^\/api\/ota\/uploads\/[^/]+\/complete$/)) {
    const id = pathname.split('/')[4];
    MOCK_OTA_UPLOADS.set(id, { ...MOCK_OTA_UPLOADS.get(id), status: 'succeeded' });
    return jsonResponse(otaStatus(id));
  }
  if (pathname === '/api/files/roots') return jsonResponse({ roots: ['/root', '/data', '/var/log'], defaultLogDir: '/var/log' });
  if (pathname.startsWith('/api/files/list') || pathname.startsWith('/api/logs/files')) return jsonResponse({ entries: [] });
  if (pathname.startsWith('/api/files/preview') || pathname.startsWith('/api/logs/tail')) return jsonResponse({ path: pathname, content: '模拟日志内容\n系统运行正常', truncated: false, binary: false, nextOffset: 0, fileSize: 32 });
  if (pathname.startsWith('/api/')) return jsonResponse({ status: 'ok', message: '模拟接口调用成功', ...(body && typeof body === 'object' ? {} : {}) });
  return jsonResponse({}, 404);
}

export function installMockRuntime(): void {
  if (typeof window === 'undefined' || window.__ct16MockRuntimeInstalled) return;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, window.location.origin);
    if (!url.pathname.startsWith('/api/')) return nativeFetch(input, init);
    const method = init?.method || (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET');
    let body: unknown;
    try { body = init?.body ? JSON.parse(String(init.body)) : undefined; } catch { body = undefined; }
    return routeResponse(url.pathname, method.toUpperCase(), body, new Headers(init?.headers));
  };
  const NativeEventSource = window.EventSource;
  class MockEventSource {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSED = 2;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSED = 2;
    readyState = MockEventSource.OPEN;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: (() => void) | null = null;
    private readonly timer: number;

    constructor() {
      this.timer = window.setInterval(() => {
        if (this.readyState === MockEventSource.OPEN) {
          this.onmessage?.(new MessageEvent('message', { data: `[mock] ${new Date().toISOString()} 系统运行正常` }));
        }
      }, 1300);
    }

    close(): void {
      this.readyState = MockEventSource.CLOSED;
      window.clearInterval(this.timer);
    }
  }
  window.EventSource = (MockEventSource as unknown as typeof NativeEventSource);
  window.__ct16MockRuntimeInstalled = true;
}

declare global {
  interface Window { __ct16MockRuntimeInstalled?: boolean }
}
