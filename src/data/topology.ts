// EXPORTS: INetworkDevice, INetworkLink, IDeviceNode, IDeviceLink, IModuleSlot, IModuleChannel, MOCK_NETWORK_DEVICES, MOCK_NETWORK_LINKS, MOCK_DEVICE_NODES, MOCK_DEVICE_LINKS, MOCK_MODULE_SLOTS, MOCK_IO_MODULE_COUNT

// ===== 一、组网拓扑（软总线超级终端）=====

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
    deviceType: 'CT16 在鸿控制器',
    role: 'master',
    status: 'online',
    ip: '192.168.1.10',
    firmware: 'v3.2.1',
    uptime: '45天 12时 30分',
    latency: 0,
    throughput: '1.2 Gbps',
    angle: 0,
    distance: 0,
  },
  {
    id: 'net-slave-01',
    name: 'CT16-Slave-01',
    model: 'CT16',
    deviceType: 'CT16 控制器',
    role: 'slave',
    status: 'online',
    ip: '192.168.1.11',
    firmware: 'v3.2.0',
    uptime: '30天 8时 15分',
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
    uptime: '60天 3时 42分',
    latency: 5,
    throughput: '950 Mbps',
    angle: -144,
    distance: 220,
  },
  {
    id: 'net-slave-03',
    name: 'CT21B-IPC-01',
    model: 'CT21B',
    deviceType: 'CT21B 工控机',
    role: 'slave',
    status: 'online',
    ip: '192.168.1.30',
    firmware: 'v4.1.0',
    uptime: '22天 16时 8分',
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
    uptime: '0天 0时 0分',
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
    uptime: '35天 9时 20分',
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
  serialNumber: string
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
  { id: 'dev-th-1', name: '温湿度传感器-01', deviceType: '温湿度传感器', category: 'sensor', interfaceType: 'RS485', interfaceLabel: 'RS485-1', status: 'normal', value: '25.6 / 65', unit: '℃/%RH', serialNumber: 'SN-TH-0001', address: 'MODBUS-0x01', description: '车间环境温湿度监测', location: '车间A区-东墙', lastUpdate: '2秒前', angle: -90, distance: 200, group: 'rs485' },
  { id: 'dev-th-2', name: '温湿度传感器-02', deviceType: '温湿度传感器', category: 'sensor', interfaceType: 'RS485', interfaceLabel: 'RS485-1', status: 'normal', value: '24.9 / 62', unit: '℃/%RH', serialNumber: 'SN-TH-0002', address: 'MODBUS-0x02', description: '仓库环境温湿度监测', location: '原料仓库-中区', lastUpdate: '3秒前', angle: -50, distance: 205, group: 'rs485' },
  { id: 'dev-th-3', name: '温湿度传感器-03', deviceType: '温湿度传感器', category: 'sensor', interfaceType: 'RS485', interfaceLabel: 'RS485-2', status: 'warning', value: '31.2 / 71', unit: '℃/%RH', serialNumber: 'SN-TH-0003', address: 'MODBUS-0x03', description: '电控柜温湿度监测', location: '电控柜-顶部', lastUpdate: '4秒前', angle: -10, distance: 200, group: 'rs485' },
  { id: 'dev-act-1', name: '执行器-风机', deviceType: '执行器', category: 'actuator', interfaceType: 'DO', interfaceLabel: 'DO-01', status: 'normal', value: '运行中', unit: '', serialNumber: 'SN-ACT-0001', address: 'DO-CH01', description: '车间通风主风机', location: '车间A区-屋顶', lastUpdate: '1秒前', angle: 50, distance: 200, group: 'do' },
  { id: 'dev-act-2', name: '执行器-调节阀', deviceType: '执行器', category: 'actuator', interfaceType: 'AO', interfaceLabel: 'AO-01', status: 'normal', value: '45', unit: '%', serialNumber: 'SN-ACT-0002', address: 'AO-CH01', description: '冷却水流量调节阀', location: '冷却系统-进水口', lastUpdate: '3秒前', angle: 110, distance: 200, group: 'ao' },
  { id: 'dev-act-3', name: '执行器-信号灯', deviceType: '执行器', category: 'actuator', interfaceType: 'DO', interfaceLabel: 'DO组-01', status: 'normal', value: '绿灯亮', unit: '', serialNumber: 'SN-ACT-0003', address: 'DO-CH04-06', description: '车间通道交通指示', location: '车间通道-交叉口', lastUpdate: '1秒前', angle: 170, distance: 205, group: 'do' },
  { id: 'dev-input-1', name: '输入设备-急停', deviceType: '输入设备', category: 'input', interfaceType: 'DI', interfaceLabel: 'DI-01', status: 'normal', value: '未按下', unit: '', serialNumber: 'SN-IN-0001', address: 'DI-CH01', description: '急停按钮（主回路）', location: '1号生产线-操作台', lastUpdate: '1秒前', angle: 230, distance: 200, group: 'di' },
  { id: 'dev-input-2', name: '输入设备-门磁', deviceType: '输入设备', category: 'input', interfaceType: 'DI', interfaceLabel: 'DI-02', status: 'normal', value: '闭合', unit: '', serialNumber: 'SN-IN-0002', address: 'DI-CH02', description: '控制柜门磁状态', location: '主控柜-前门', lastUpdate: '2秒前', angle: 250, distance: 205, group: 'di' },
  { id: 'dev-input-3', name: '输入设备-限位', deviceType: '输入设备', category: 'input', interfaceType: 'DI', interfaceLabel: 'DI-03', status: 'offline', value: '离线', unit: '', serialNumber: 'SN-IN-0003', address: 'DI-CH03', description: '输送线末端限位开关', location: '输送线-末端', lastUpdate: '5分钟前', angle: 265, distance: 205, group: 'di' },
  { id: 'dev-plc-1', name: 'PLC控制器-01', deviceType: 'PLC控制器', category: 'other', interfaceType: 'ETH', interfaceLabel: 'ETH1', status: 'normal', value: '在线', unit: '', serialNumber: 'SN-PLC-0001', address: '192.168.1.50', description: '辅助产线逻辑控制', location: '2号生产线-控制柜', lastUpdate: '1秒前', angle: 290, distance: 200, group: 'eth' },
  { id: 'dev-plc-2', name: 'PLC控制器-02', deviceType: 'PLC控制器', category: 'other', interfaceType: 'ETH', interfaceLabel: 'ETH2', status: 'normal', value: '在线', unit: '', serialNumber: 'SN-PLC-0002', address: '192.168.1.51', description: '包装线联动控制', location: '包装线-控制柜', lastUpdate: '2秒前', angle: 310, distance: 200, group: 'eth' },
];

export const MOCK_DEVICE_LINKS: IDeviceLink[] = MOCK_DEVICE_NODES.map((node) => ({
  id: `dlink-${node.id}`,
  source: 'dev-controller',
  target: node.id,
  interfaceType: node.interfaceType,
  label: node.interfaceLabel,
}));

// ===== 三、模块拓扑（设备内部扩展模块）=====

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
  version: 'V3.2.1' | 'V3.2.3'
  adcValue: number
  type: string
  spec: string
  status: 'normal' | 'warning' | 'fault' | 'empty'
  channels: number
  channelList: IModuleChannel[]
  position: 'left' | 'right'
}

export const MOCK_IO_MODULE_COUNT = 7;

export const MOCK_MODULE_SLOTS: IModuleSlot[] = [
  // 左侧：主控单元
  {
    id: 'mod-main',
    slotNumber: 0,
    model: 'CT16-MAIN',
    name: '主控模块',
    version: 'V3.2.1',
    adcValue: 0,
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
    version: 'V3.2.1',
    adcValue: 0,
    type: '无线通信',
    spec: '4G LTE + WiFi 2.4G/5G',
    status: 'normal',
    channels: 2,
    channelList: [
      { index: 1, label: '4G', status: 'normal', value: '已连接', unit: '' },
      { index: 2, label: 'WiFi', status: 'normal', value: '已连接', unit: '' },
    ],
    position: 'left',
  },
  // 左侧：无线扩展槽2
  {
    id: 'mod-wireless-2',
    slotNumber: 2,
    model: 'CT16-BLE',
    name: '蓝牙/星闪 模块',
    version: 'V3.2.3',
    adcValue: 0,
    type: '无线通信',
    spec: 'BLE 5.2 + 星闪 1.0',
    status: 'normal',
    channels: 2,
    channelList: [
      { index: 1, label: 'BLE', status: 'normal', value: '已连接', unit: '' },
      { index: 2, label: '星闪', status: 'normal', value: '已连接', unit: '' },
    ],
    position: 'left',
  },
  // 右侧：IO扩展模块
  {
    id: 'mod-di16',
    slotNumber: 1,
    model: 'DI16',
    name: 'DI16',
    version: 'V3.2.1',
    adcValue: 18,
    type: 'DI 输入',
    spec: '16路 NPN/PNP 24VDC',
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
    slotNumber: 2,
    model: 'DO16',
    name: 'DO16',
    version: 'V3.2.3',
    adcValue: 42,
    type: 'DO 输出',
    spec: '16路 NPN 晶体管 24VDC',
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
    slotNumber: 3,
    model: 'AI8',
    name: 'AI8',
    version: 'V3.2.1',
    adcValue: 73,
    type: 'AI 输入',
    spec: '8路 4-20mA / 0-10V',
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
    slotNumber: 4,
    model: 'AO8',
    name: 'AO8',
    version: 'V3.2.3',
    adcValue: 108,
    type: 'AO 输出',
    spec: '8路 4-20mA / 0-10V',
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
    id: 'mod-rs232',
    slotNumber: 5,
    model: 'RS232-2CH',
    name: 'RS232-2CH',
    version: 'V3.2.1',
    adcValue: 139,
    type: 'RS232 通信',
    spec: '2路 RS232 隔离',
    status: 'normal',
    channels: 2,
    channelList: [
      { index: 1, label: 'COM1', status: 'normal', value: '115200bps', unit: '' },
      { index: 2, label: 'COM2', status: 'normal', value: '9600bps', unit: '' },
    ],
    position: 'right',
  },
  {
    id: 'mod-rs485',
    slotNumber: 6,
    model: 'RS485-2CH',
    name: 'RS485-2CH',
    version: 'V3.2.3',
    adcValue: 171,
    type: 'RS485 通信',
    spec: '2路 RS485 隔离',
    status: 'normal',
    channels: 2,
    channelList: [
      { index: 1, label: 'COM1', status: 'normal', value: '115200bps', unit: '' },
      { index: 2, label: 'COM2', status: 'normal', value: '9600bps', unit: '' },
    ],
    position: 'right',
  },
  {
    id: 'mod-nmea',
    slotNumber: 7,
    model: 'NMEA',
    name: 'NMEA',
    version: 'V3.2.1',
    adcValue: 214,
    type: 'NMEA 通信',
    spec: 'NMEA 0183/2000 导航数据接口',
    status: 'normal',
    channels: 2,
    channelList: [
      { index: 1, label: 'NMEA-IN', status: 'normal', value: '4800bps', unit: '' },
      { index: 2, label: 'NMEA-OUT', status: 'normal', value: '4800bps', unit: '' },
    ],
    position: 'right',
  },
];
