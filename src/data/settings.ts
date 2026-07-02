// EXPORTS: INetworkSettings, ITimeSettings, ISecuritySettings, IServiceItem, MOCK_NETWORK_SETTINGS, MOCK_TIME_SETTINGS, MOCK_SECURITY_SETTINGS, MOCK_SERVICES

export interface INetworkSettings {
  ipAddress: string
  subnetMask: string
  gateway: string
  dnsPrimary: string
  dnsSecondary: string
}

export interface ITimeSettings {
  timezone: string
  ntpServer: string
  manualDateTime: string
}

export interface ISecuritySettings {
  adminPassword: string
  allowedIps: string[]
  sshEnabled: boolean
  httpsOnly: boolean
}

export interface IServiceItem {
  id: string
  name: string
  status: 'running' | 'stopped' | 'error'
  port: number
  description: string
}

export const MOCK_NETWORK_SETTINGS: INetworkSettings = {
  ipAddress: '192.168.1.1',
  subnetMask: '255.255.255.0',
  gateway: '192.168.1.254',
  dnsPrimary: '8.8.8.8',
  dnsSecondary: '114.114.114.114',
};

export const MOCK_TIME_SETTINGS: ITimeSettings = {
  timezone: 'Asia/Shanghai',
  ntpServer: 'ntp.aliyun.com',
  manualDateTime: '',
};

export const MOCK_SECURITY_SETTINGS: ISecuritySettings = {
  adminPassword: '********',
  allowedIps: ['192.168.1.100', '10.0.0.50'],
  sshEnabled: true,
  httpsOnly: true,
};

export const MOCK_SERVICES: IServiceItem[] = [
  { id: 'svc-1', name: 'Modbus TCP 服务', status: 'running', port: 502, description: 'Modbus TCP 协议转换与数据采集' },
  { id: 'svc-2', name: 'MQTT Broker', status: 'running', port: 1883, description: '本地 MQTT 消息代理服务' },
  { id: 'svc-3', name: 'OPC UA 服务', status: 'running', port: 4840, description: 'OPC UA 服务器，提供标准化数据接口' },
  { id: 'svc-4', name: 'Node-RED 运行时', status: 'running', port: 1880, description: '可视化流程编程引擎' },
  { id: 'svc-5', name: 'PicoClaw 智能体', status: 'running', port: 9090, description: '端侧 AI 智能体运行环境' },
  { id: 'svc-6', name: 'SNMP 代理', status: 'stopped', port: 161, description: 'SNMP v2c/v3 网络管理代理' },
];
