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
  angle: number
  distance: number
}

export interface INetworkLink {
  id: string
  source: string
  target: string
  label: string
  status: 'active' | 'inactive'
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
    angle: 0,
    distance: 260,
  },
];

export const MOCK_NETWORK_LINKS: INetworkLink[] = [
  { id: 'nlink-1', source: 'net-master', target: 'net-slave-01', label: '软总线', status: 'active' },
  { id: 'nlink-2', source: 'net-master', target: 'net-slave-02', label: '软总线', status: 'active' },
  { id: 'nlink-3', source: 'net-master', target: 'net-slave-03', label: '软总线', status: 'active' },
  { id: 'nlink-4', source: 'net-master', target: 'net-slave-04', label: '软总线', status: 'inactive' },
  { id: 'nlink-5', source: 'net-master', target: 'net-slave-05', label: '软总线', status: 'active' },
];

// ===== 二、设备拓扑（下游子设备）=====

export interface IDeviceNode {
  id: string
  name: string
  deviceType: string
  modelName?: string
  iconUrl?: string
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
  readError?: string
  statusValues?: Array<{
    id: string
    name: string
    value: string
    unit: string
    isEnum: boolean
    values: Array<{
      valueJSON: string
      meaning: string
    }>
  }>
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
    spec: 'RK3506J 1.2GHz',
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
    spec: '8路 4-20mA 电流输入',
    status: 'normal',
    channels: 8,
    channelList: [
      { index: 1, label: 'CI-01', status: 'normal', value: '12.5', unit: 'mA' },
      { index: 2, label: 'CI-02', status: 'normal', value: '8.2', unit: 'mA' },
      { index: 3, label: 'CI-03', status: 'normal', value: '16.8', unit: 'mA' },
      { index: 4, label: 'CI-04', status: 'normal', value: '19.5', unit: 'mA' },
      { index: 5, label: 'CI-05', status: 'normal', value: '10.4', unit: 'mA' },
      { index: 6, label: 'CI-06', status: 'normal', value: '14.2', unit: 'mA' },
      { index: 7, label: 'CI-07', status: 'normal', value: '3.2', unit: 'mA' },
      { index: 8, label: 'CI-08', status: 'normal', value: '6.5', unit: 'mA' },
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
    spec: '4路 0-10V 电压输出 + 4路 4-20mA 电流输出',
    status: 'normal',
    channels: 8,
    channelList: [
      { index: 1, label: 'VO-01', status: 'normal', value: '2.4', unit: 'V' },
      { index: 2, label: 'VO-02', status: 'normal', value: '5.0', unit: 'V' },
      { index: 3, label: 'VO-03', status: 'normal', value: '7.5', unit: 'V' },
      { index: 4, label: 'VO-04', status: 'normal', value: '9.2', unit: 'V' },
      { index: 5, label: 'CO-01', status: 'normal', value: '12.0', unit: 'mA' },
      { index: 6, label: 'CO-02', status: 'normal', value: '3.6', unit: 'mA' },
      { index: 7, label: 'CO-03', status: 'normal', value: '16.4', unit: 'mA' },
      { index: 8, label: 'CO-04', status: 'normal', value: '8.8', unit: 'mA' },
    ],
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
    spec: '1路 RS232 NMEA 0183 定位接口',
    status: 'normal',
    channels: 1,
    channelList: [
      { index: 1, label: 'RS232-NMEA', status: 'normal', value: '4800bps', unit: '' },
    ],
    position: 'right',
  },
];

// ===== 四、API 数据转换函数 =====

import type {
  Ct16NetworkDeviceDto,
  Ct16NetworkDeviceListDto,
  Ct16CustomNetworkDeviceDto,
  Ct16CustomNetworkDeviceListDto,
} from '@/api/types'

/**
 * 将后端组网拓扑 DTO 转换为前端 INetworkDevice 类型
 */
export function mapNetworkDtoToDevice(dto: Ct16NetworkDeviceDto): INetworkDevice {
  return {
    id: dto.devId,
    name: dto.devName,
    model: dto.deviceType,
    deviceType: dto.deviceType,
    role: dto.role,
    status: dto.onlineStatus ? 'online' : 'offline',
    ip: '',
    firmware: dto.devVersion,
    angle: 0,
    distance: 0,
  }
}

/**
 * 将后端组网拓扑列表转换为前端格式
 */
export function mapNetworkDtoListToDevices(
  list: Ct16NetworkDeviceListDto,
): { devices: INetworkDevice[]; links: INetworkLink[] } {
  const devices = list.devices.map(mapNetworkDtoToDevice)

  // 为 devices 计算布局角度和距离
  const totalSlaves = devices.filter((d) => d.role === 'slave').length
  let slaveIndex = 0
  for (const d of devices) {
    if (d.role === 'slave') {
      const angle = -72 + (slaveIndex / Math.max(totalSlaves - 1, 1)) * 144
      d.angle = angle
      d.distance = 200 + (slaveIndex % 3) * 10
      slaveIndex++
    }
  }

  // 生成软总线连接
  const master = devices.find((d) => d.role === 'master')
  const links = devices
    .filter((d) => d.role === 'slave')
    .map((slave, i) => ({
      id: `nlink-${i + 1}`,
      source: master?.id ?? '',
      target: slave.id,
      label: '软总线',
      status: (slave.status === 'online' ? 'active' : 'inactive') as 'active' | 'inactive',
    }))

  return { devices, links }
}

/**
 * 解析 base64 编码的 customData JSON，提取设备自定义字段
 */
function parseCustomData(customData: string): { ip: string; fwVer: string; master: string } {
  try {
    if (!customData) {
      return { ip: '', fwVer: '', master: '' }
    }
    const decoded = atob(customData)
    const data = JSON.parse(decoded)
    return {
      ip: typeof data.ip === 'string' ? data.ip : '',
      fwVer: typeof data.fwVer === 'string' ? data.fwVer : '',
      master: typeof data.master === 'string' ? data.master : '',
    }
  } catch {
    return { ip: '', fwVer: '', master: '' }
  }
}

/**
 * 将后端系统拓扑自定义设备列表转换为前端组网拓扑格式，
 * 从 customData 中解析 ip、fwVer、master 字段
 */
export function mapCustomDtoListToNetworkDevices(
  list: Ct16CustomNetworkDeviceListDto,
): { devices: INetworkDevice[]; links: INetworkLink[] } {
  const devices: INetworkDevice[] = list.devices.map((dto) => {
    const custom = parseCustomData(dto.customData)
    return {
      id: dto.devId,
      name: dto.devName,
      model: dto.deviceType,
      deviceType: dto.deviceType,
      role: dto.role,
      status: dto.onlineStatus ? 'online' : 'offline',
      ip: custom.ip,
      firmware: custom.fwVer || dto.devVersion,
      angle: 0,
      distance: 0,
    }
  })

  // 为 devices 计算布局角度和距离
  const totalSlaves = devices.filter((d) => d.role === 'slave').length
  let slaveIndex = 0
  for (const d of devices) {
    if (d.role === 'slave') {
      const angle = -72 + (slaveIndex / Math.max(totalSlaves - 1, 1)) * 144
      d.angle = angle
      d.distance = 200 + (slaveIndex % 3) * 10
      slaveIndex++
    }
  }

  // 生成软总线连接
  const master = devices.find((d) => d.role === 'master')
  const links = devices
    .filter((d) => d.role === 'slave')
    .map((slave, i) => ({
      id: `nlink-${i + 1}`,
      source: master?.id ?? '',
      target: slave.id,
      label: '软总线',
      status: (slave.status === 'online' ? 'active' : 'inactive') as 'active' | 'inactive',
    }))

  return { devices, links }
}

/**
 * 将后端系统拓扑自定义设备 DTO 转换为前端 IDeviceNode 类型
 */
export function mapCustomDtoToDeviceNode(
  dto: Ct16CustomNetworkDeviceDto,
): IDeviceNode {
  const categoryMap: Record<string, IDeviceNode['category']> = {
    sensor: 'sensor',
    actuator: 'actuator',
    input: 'input',
  }

  return {
    id: dto.devId,
    name: dto.devName,
    deviceType: dto.deviceType || '未知设备',
    category: categoryMap[dto.deviceType] ?? 'other',
    interfaceType: '软总线',
    interfaceLabel: 'SoftBus',
    status: dto.onlineStatus ? 'normal' : 'offline',
    value: dto.onlineStatus ? '在线' : '离线',
    unit: '',
    serialNumber: dto.devId,
    address: '',
    description: dto.devName,
    location: '',
    lastUpdate: new Date().toLocaleString(),
    angle: 0,
    distance: 0,
    group: 'eth',
  }
}

/**
 * 将后端系统拓扑列表转换为前端格式
 */
export function mapCustomDtoListToDeviceNodes(
  list: Ct16CustomNetworkDeviceListDto,
): { nodes: IDeviceNode[]; links: { id: string; source: string; target: string; interfaceType: string; label: string }[] } {
  // 跳过本机（master），其他设备作为下游节点
  const slaveDevices = list.devices.filter((d) => d.role === 'slave')
  const nodes = slaveDevices.map(mapCustomDtoToDeviceNode)

  // 更新角度和距离
  const totalNodes = nodes.length
  for (let i = 0; i < totalNodes; i++) {
    nodes[i].angle = -90 + (i / Math.max(totalNodes - 1, 1)) * 180
    nodes[i].distance = 200
  }

  // 生成连接（控制器 -> 各设备）
  const links = nodes.map((node) => ({
    id: `dlink-${node.id}`,
    source: 'dev-controller',
    target: node.id,
    interfaceType: '软总线',
    label: 'SoftBus',
  }))

  return { nodes, links }
}
