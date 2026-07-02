// EXPORTS: INetworkDevice, INetworkLink, IDeviceNode, IDeviceLink, IModuleSlot, IModuleChannel, MOCK_NETWORK_DEVICES, MOCK_NETWORK_LINKS, MOCK_DEVICE_NODES, MOCK_DEVICE_LINKS, MOCK_MODULE_SLOTS

// ===== 一、组网拓扑（软总线超级终端�?====

export interface INetworkDevice {
  id: string
  name: string
  model: string
  deviceType: string
  role: 'master' | 'slave'
  status: 'online' | 'offline'
  ip: string
  firmware: string
  uptime: string
  latency: number
  throughput: string
  angle: number
  distance: number
}

export interface INetworkLink {
  id: string
  source: string
  target: string
  label: string
  status: 'active' | 'inactive'
  latency: number
  quality: 'excellent' | 'good' | 'fair' | 'poor'
}

export const MOCK_NETWORK_DEVICES: INetworkDevice[] = [
  {
    id: 'net-master',
    name: 'CT16-Master-01',
    model: 'CT16',
    deviceType: 'CT16 在鸿控制�?,
    role: 'master',
    status: 'online',
    ip: '192.168.1.10',
    firmware: 'v3.2.1',
    uptime: '45�?12�?30�?,
    latency: 0,
    throughput: '1.2 Gbps',
    angle: 0,
    distance: 0,
  },
  {
    id: 'net-slave-01',
    name: 'CT16-Slave-01',
    model: 'CT16',
    deviceType: 'CT16 控制�?,
    role: 'slave',
    status: 'online',
    ip: '192.168.1.11',
    firmware: 'v3.2.0',
    uptime: '30�?8�?15�?,
    latency: 3,
    throughput: '800 Mbps',
    angle: -72,
    distance: 200,
  },
  {
    id: 'net-slave-02',
    name: 'CT32-Gateway-01',
    model: 'CT32',
    deviceType: 'CT32 工业网关',
    role: 'slave',
    status: 'online',
    ip: '192.168.1.20',
    firmware: 'v2.8.5',
    uptime: '60�?3�?42�?,
    latency: 5,
    throughput: '950 Mbps',
    angle: -144,
    distance: 220,
  },
  {
    id: 'net-slave-03',
    name: 'CT21B-IPC-01',
    model: 'CT21B',
    deviceType: 'CT21B 工控�?,
    role: 'slave',
    status: 'online',
    ip: '192.168.1.30',
    firmware: 'v4.1.0',
    uptime: '22�?16�?8�?,
    latency: 8,
    throughput: '620 Mbps',
    angle: 144,
    distance: 220,
  },
  {
    id: 'net-slave-04',
    name: 'Pad-运维-01',
    model: 'HarmonyPad',
    deviceType: '鸿蒙平板',
    role: 'slave',
    status: 'offline',
    ip: '192.168.1.50',
    firmware: 'HarmonyOS 4.0',
    uptime: '0�?0�?0�?,
    latency: 0,
    throughput: '0 Mbps',
    angle: 72,
    distance: 200,
  },
  {
    id: 'net-slave-05',
    name: 'CT33-Gateway-02',
    model: 'CT33',
    deviceType: 'CT33 网关',
    role: 'slave',
    status: 'online',
    ip: '192.168.1.21',
    firmware: 'v2.8.5',
    uptime: '35�?9�?20�?,
    latency: 6,
    throughput: '880 Mbps',
    angle: 0,
    distance: 260,
  },
];

export const MOCK_NETWORK_LINKS: INetworkLink[] = [
  { id: 'nlink-1', source: 'net-master', target: 'net-slave-01', label: '软总线', status: 'active', latency: 3, quality: 'excellent' },
  { id: 'nlink-2', source: 'net-master', target: 'net-slave-02', label: '软总线', status: 'active', latency: 5, quality: 'excellent' },
  { id: 'nlink-3', source: 'net-master', target: 'net-slave-03', label: '软总线', status: 'active', latency: 8, quality: 'good' },
  { id: 'nlink-4', source: 'net-master', target: 'net-slave-04', label: '软总线', status: 'inactive', latency: 0, quality: 'poor' },
  { id: 'nlink-5', source: 'net-master', target: 'net-slave-05', label: '软总线', status: 'active', latency: 6, quality: 'good' },
];

// ===== 二、设备拓扑（下游子设备）=====

export interface IDeviceNode {
  id: string
  name: string
  deviceType: string
  category: 'sensor' | 'actuator' | 'input' | 'other'
  interfaceType: string
  interfaceLabel: string
  status: 'normal' | 'warning' | 'offline'
  value: string
  unit: string
  address: string
  description: string
  location: string
  lastUpdate: string
  angle: number
  distance: number
  group: 'rs485' | 'di' | 'do' | 'ai' | 'ao' | 'eth'
}

export interface IDeviceLink {
  id: string
  source: string
  target: string
  interfaceType: string
  label: string
}

export const MOCK_DEVICE_NODES: IDeviceNode[] = [
  // ── 传感器类�?个）── ──
  { id: 'dev-temp-1', name: '温度传感�?, deviceType: '温度传感�?, category: 'sensor', interfaceType: 'RS485', interfaceLabel: 'RS485-1', status: 'normal', value: '25.6', unit: '�?, address: 'MODBUS-0x01', description: '车间环境温度监测', location: '车间A�?东墙', lastUpdate: '2秒前', angle: -90, distance: 200, group: 'rs485' },
  { id: 'dev-humi-1', name: '湿度传感�?, deviceType: '湿度传感�?, category: 'sensor', interfaceType: 'RS485', interfaceLabel: 'RS485-1', status: 'normal', value: '65', unit: '%RH', address: 'MODBUS-0x04', description: '仓库环境湿度监测', location: '原料仓库-中区', lastUpdate: '3秒前', angle: -50, distance: 205, group: 'rs485' },
  { id: 'dev-pres-1', name: '压力变送器', deviceType: '压力变送器', category: 'sensor', interfaceType: 'AI', interfaceLabel: 'AI-01', status: 'normal', value: '0.85', unit: 'MPa', address: 'AI-CH01', description: '主管道压力监�?, location: '1号生产线-主管�?, lastUpdate: '1秒前', angle: -10, distance: 200, group: 'ai' },

  // ── 执行器类�?个）── ──
  { id: 'dev-fan-1', name: '风机', deviceType: '风机', category: 'actuator', interfaceType: 'DO', interfaceLabel: 'DO-01', status: 'normal', value: '运行�?, unit: '', address: 'DO-CH01', description: '车间通风主风�?, location: '车间A�?屋顶', lastUpdate: '1秒前', angle: 50, distance: 200, group: 'do' },
  { id: 'dev-valve-1', name: '调节阀', deviceType: '电动调节阀', category: 'actuator', interfaceType: 'AO', interfaceLabel: 'AO-01', status: 'normal', value: '45', unit: '%', address: 'AO-CH01', description: '冷却水流量调节阀', location: '冷却系统-进水�?, lastUpdate: '3秒前', angle: 110, distance: 200, group: 'ao' },
  { id: 'dev-light-1', name: '交通信号灯', deviceType: '信号�?, category: 'actuator', interfaceType: 'DO', interfaceLabel: 'DO�?01', status: 'normal', value: '绿灯�?, unit: '', address: 'DO-CH04-06', description: '车间通道交通指�?, location: '车间通道-交叉�?, lastUpdate: '1秒前', angle: 170, distance: 205, group: 'do' },

  // ── 输入设备类（1个）── ──
  { id: 'dev-btn-1', name: '按钮', deviceType: '按钮开�?, category: 'input', interfaceType: 'DI', interfaceLabel: 'DI-01', status: 'normal', value: '未按�?, unit: '', address: 'DI-CH01', description: '急停按钮（主回路�?, location: '1号生产线-操作�?, lastUpdate: '1秒前', angle: 230, distance: 200, group: 'di' },

  // ── 其他设备�?个）── ──
  { id: 'dev-plc-1', name: '小型PLC', deviceType: 'PLC控制�?, category: 'other', interfaceType: 'ETH', interfaceLabel: 'ETH', status: 'normal', value: '在线', unit: '', address: '192.168.1.50', description: '辅助产线逻辑控制', location: '2号生产线-控制�?, lastUpdate: '1秒前', angle: 290, distance: 200, group: 'eth' },
];

export const MOCK_DEVICE_LINKS: IDeviceLink[] = MOCK_DEVICE_NODES.map((node) => ({
  id: `dlink-${node.id}`,
  source: 'dev-controller',
  target: node.id,
  interfaceType: node.interfaceType,
  label: node.interfaceLabel,
}));

// ===== 三、模块拓扑（设备内部扩展模块�?====

export interface IModuleChannel {
  index: number
  label: string
  status: 'normal' | 'warning' | 'fault' | 'off'
  value: string
  unit: string
}

export interface IModuleSlot {
  id: string
  slotNumber: number
  model: string
  name: string
  type: string
  spec: string
  status: 'normal' | 'warning' | 'fault' | 'empty'
  channels: number
  channelList: IModuleChannel[]
  position: 'left' | 'right'
}

export const MOCK_MODULE_SLOTS: IModuleSlot[] = [
  // 左侧：主控单�?  {
    id: 'mod-main',
    slotNumber: 0,
    model: 'CT16-MAIN',
    name: '主控模块',
    type: '主控单元',
    spec: 'HPM6754 双核 RISC-V 800MHz',
    status: 'normal',
    channels: 5,
    channelList: [
      { index: 1, label: 'POW', status: 'normal', value: 'ON', unit: '' },
      { index: 2, label: 'SYS', status: 'normal', value: 'ON', unit: '' },
      { index: 3, label: 'NET', status: 'normal', value: 'ON', unit: '' },
      { index: 4, label: 'BLE', status: 'normal', value: 'ON', unit: '' },
      { index: 5, label: 'ERR', status: 'off', value: 'OFF', unit: '' },
    ],
    position: 'left',
  },
  // 左侧：无线扩展槽1
  {
    id: 'mod-wireless-1',
    slotNumber: 1,
    model: 'CT16-4G',
    name: '4G/WiFi 模块',
    type: '无线通信',
    spec: '4G LTE + WiFi 2.4G/5G',
    status: 'normal',
    channels: 2,
    channelList: [
      { index: 1, label: '4G', status: 'normal', value: '已连�?, unit: '' },
      { index: 2, label: 'WiFi', status: 'normal', value: '已连�?, unit: '' },
    ],
    position: 'left',
  },
  // 左侧：无线扩展槽2
  {
    id: 'mod-wireless-2',
    slotNumber: 2,
    model: 'CT16-BLE',
    name: '蓝牙/星闪 模块',
    type: '无线通信',
    spec: 'BLE 5.2 + 星闪 1.0',
    status: 'normal',
    channels: 2,
    channelList: [
      { index: 1, label: 'BLE', status: 'normal', value: '已连�?, unit: '' },
      { index: 2, label: '星闪', status: 'normal', value: '已连�?, unit: '' },
    ],
    position: 'left',
  },
  // 右侧：IO扩展模块
  {
    id: 'mod-di16',
    slotNumber: 3,
    model: 'CTS-DI16',
    name: '数字量输入模�?,
    type: 'DI 输入',
    spec: '16�?NPN/PNP 24VDC',
    status: 'normal',
    channels: 16,
    channelList: Array.from({ length: 16 }, (_, i) => ({
      index: i + 1,
      label: `DI-${String(i + 1).padStart(2, '0')}`,
      status: (i === 13 || i === 14 ? 'warning' : i === 15 ? 'off' : 'normal') as IModuleChannel['status'],
      value: i === 15 ? 'OFF' : (i % 3 === 0 ? 'OFF' : 'ON'),
      unit: '',
    })),
    position: 'right',
  },
  {
    id: 'mod-do16',
    slotNumber: 4,
    model: 'CTS-DO16N',
    name: '数字量输出模�?,
    type: 'DO 输出',
    spec: '16�?NPN 晶体�?24VDC',
    status: 'normal',
    channels: 16,
    channelList: Array.from({ length: 16 }, (_, i) => ({
      index: i + 1,
      label: `DO-${String(i + 1).padStart(2, '0')}`,
      status: 'normal' as IModuleChannel['status'],
      value: i < 8 ? 'ON' : 'OFF',
      unit: '',
    })),
    position: 'right',
  },
  {
    id: 'mod-ai8',
    slotNumber: 5,
    model: 'CTS-AI8',
    name: '模拟量输入模�?,
    type: 'AI 输入',
    spec: '8�?4-20mA / 0-10V',
    status: 'normal',
    channels: 8,
    channelList: [
      { index: 1, label: 'AI-01', status: 'normal', value: '12.5', unit: 'mA' },
      { index: 2, label: 'AI-02', status: 'normal', value: '8.2', unit: 'mA' },
      { index: 3, label: 'AI-03', status: 'normal', value: '16.8', unit: 'mA' },
      { index: 4, label: 'AI-04', status: 'warning', value: '19.5', unit: 'mA' },
      { index: 5, label: 'AI-05', status: 'normal', value: '4.8', unit: 'V' },
      { index: 6, label: 'AI-06', status: 'normal', value: '7.2', unit: 'V' },
      { index: 7, label: 'AI-07', status: 'fault', value: '0.0', unit: 'V' },
      { index: 8, label: 'AI-08', status: 'normal', value: '3.5', unit: 'V' },
    ],
    position: 'right',
  },
  {
    id: 'mod-ao8',
    slotNumber: 6,
    model: 'CTS-AO8',
    name: '模拟量输出模�?,
    type: 'AO 输出',
    spec: '8�?4-20mA / 0-10V',
    status: 'normal',
    channels: 8,
    channelList: Array.from({ length: 8 }, (_, i) => ({
      index: i + 1,
      label: i < 4 ? `AO-V${String(i + 1).padStart(2, '0')}` : `AO-I${String(i - 3).padStart(2, '0')}`,
      status: 'normal' as IModuleChannel['status'],
      value: i < 4 ? `${(Math.random() * 8 + 1).toFixed(1)}` : `${(Math.random() * 16 + 4).toFixed(1)}`,
      unit: i < 4 ? 'V' : 'mA',
    })),
    position: 'right',
  },
  {
    id: 'mod-rs485',
    slotNumber: 7,
    model: 'CTS-RS485',
    name: '串口扩展模块',
    type: 'RS485 通信',
    spec: '2�?RS485 隔离',
    status: 'normal',
    channels: 2,
    channelList: [
      { index: 1, label: 'COM1', status: 'normal', value: '115200bps', unit: '' },
      { index: 2, label: 'COM2', status: 'normal', value: '9600bps', unit: '' },
    ],
    position: 'right',
  },
  {
    id: 'mod-empty',
    slotNumber: 8,
    model: '--',
    name: '空槽�?,
    type: '可扩�?,
    spec: '支持 DI/DO/AI/AO/RS485',
    status: 'empty',
    channels: 0,
    channelList: [],
    position: 'right',
  },
];
