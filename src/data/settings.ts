// EXPORTS: ITimeSettings, ISecuritySettings, IServiceItem, IWirelessSlotSettings, INetworkInterfaceSettings, MOCK_TIME_SETTINGS, MOCK_SECURITY_SETTINGS, MOCK_SERVICES, MOCK_WIRELESS_SLOT_SETTINGS, MOCK_NETWORK_INTERFACE_SETTINGS

export type WirelessSlotOneType = 'none' | '4g' | 'wifi'
export type WirelessSlotTwoType = 'none' | 'ble' | 'slb'

export interface IWirelessSlotSettings {
  slot1: WirelessSlotOneType
  slot2: WirelessSlotTwoType
}

export type NetworkWorkMode = 'independent' | 'bridge'
export type NetworkAddressMode = 'dhcp' | 'static'
export type NetworkInterfaceId = 'eth1' | 'eth2' | 'bridge' | '4g' | 'wifi'

export interface INetworkInterfaceConfig {
  id: NetworkInterfaceId
  name: string
  enabled: boolean
  addressMode: NetworkAddressMode
  ipAddress: string
  subnetMask: string
  gateway: string
  dnsPrimary: string
  dnsSecondary: string
  metric: string
  defaultRoute: boolean
  ssid?: string
  password?: string
  encryption?: string
  apn?: string
  username?: string
}

export interface INetworkInterfaceSettings {
  ethernetMode: NetworkWorkMode
  interfaces: Record<NetworkInterfaceId, INetworkInterfaceConfig>
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

export const MOCK_WIRELESS_SLOT_SETTINGS: IWirelessSlotSettings = {
  slot1: 'wifi',
  slot2: 'ble',
};

export const MOCK_NETWORK_INTERFACE_SETTINGS: INetworkInterfaceSettings = {
  ethernetMode: 'independent',
  interfaces: {
    eth1: {
      id: 'eth1',
      name: 'ETH1',
      enabled: true,
      addressMode: 'static',
      ipAddress: '192.168.250.25',
      subnetMask: '255.255.255.0',
      gateway: '192.168.250.1',
      dnsPrimary: '114.114.114.114',
      dnsSecondary: '8.8.8.8',
      metric: '10',
      defaultRoute: true,
    },
    eth2: {
      id: 'eth2',
      name: 'ETH2',
      enabled: true,
      addressMode: 'dhcp',
      ipAddress: '192.168.251.25',
      subnetMask: '255.255.255.0',
      gateway: '192.168.251.1',
      dnsPrimary: '114.114.114.114',
      dnsSecondary: '',
      metric: '20',
      defaultRoute: false,
    },
    bridge: {
      id: 'bridge',
      name: 'BR0 网桥',
      enabled: true,
      addressMode: 'static',
      ipAddress: '192.168.250.25',
      subnetMask: '255.255.255.0',
      gateway: '192.168.250.1',
      dnsPrimary: '114.114.114.114',
      dnsSecondary: '8.8.8.8',
      metric: '10',
      defaultRoute: true,
    },
    '4g': {
      id: '4g',
      name: '4G',
      enabled: true,
      addressMode: 'dhcp',
      ipAddress: '10.24.8.16',
      subnetMask: '255.255.255.255',
      gateway: '10.24.8.1',
      dnsPrimary: '223.5.5.5',
      dnsSecondary: '114.114.114.114',
      metric: '40',
      defaultRoute: false,
      apn: 'cmnet',
      username: '',
      password: '',
    },
    wifi: {
      id: 'wifi',
      name: 'WIFI',
      enabled: true,
      addressMode: 'dhcp',
      ipAddress: '192.168.10.25',
      subnetMask: '255.255.255.0',
      gateway: '192.168.10.1',
      dnsPrimary: '114.114.114.114',
      dnsSecondary: '',
      metric: '30',
      defaultRoute: false,
      ssid: 'ZAIOH-Factory',
      password: '',
      encryption: 'WPA2-PSK',
    },
  },
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
