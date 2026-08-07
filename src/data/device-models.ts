// EXPORTS: IDeviceModel, IDataPoint, IDeviceModelScenario, PRESET_DEVICE_MODEL_SCENARIOS, MOCK_DEVICE_MODELS, MOCK_CLOUD_DEVICE_MODELS

export type DeviceModelScenarioSource = 'preset' | 'custom'

export interface IDeviceModelScenario {
  name: string
  identifier: string
  source: DeviceModelScenarioSource
}

export const PRESET_DEVICE_MODEL_SCENARIOS: IDeviceModelScenario[] = [
  { name: '隧道场景', identifier: 'tunnel', source: 'preset' },
  { name: '沙盘场景', identifier: 'sandbox', source: 'preset' },
  { name: '工业控制场景', identifier: 'industrial-control', source: 'preset' },
  { name: '智慧水利场景', identifier: 'water-conservancy', source: 'preset' },
  { name: '能源管理场景', identifier: 'energy-management', source: 'preset' },
  { name: '园区安防场景', identifier: 'campus-security', source: 'preset' },
]

export interface IDataPoint {
  id: string
  name: string
  identifier: string
  dataType: 'int' | 'float' | 'string' | 'bool' | 'enum'
  access: 'readonly' | 'readwrite'
  unit: string
  range: string
  description: string
}

export type DeviceModelInterfaceValue = string | number

export interface IDeviceModelInterfaceConfig {
  name: string
  identifier: string
  type: string
  defaultConfig: DeviceModelInterfaceValue[]
  description: string
}

export interface IDeviceModel {
  id: string
  name: string
  type: string
  version: string
  description: string
  vendor?: string
  deviceModel?: string
  typeIdentifier?: string
  sourceFile?: string
  dataPoints: IDataPoint[]
  statusDataPoints?: IDataPoint[]
  controlDataPoints?: IDataPoint[]
  dataPointCount: number
  createdAt: string
  status: 'synced' | 'unsynced'
  tags: string[]
  applicableScenarios?: IDeviceModelScenario[]
  interfaces?: IDeviceModelInterfaceConfig[]
}

interface BuiltinDeviceModelConfig {
  id: string
  name: string
  type: string
  vendor: string
  deviceModel: string
  description: string
  sourceFile: string
  interfaces: IDeviceModelInterfaceConfig[]
  statusDataPoints: IDataPoint[]
  controlDataPoints: IDataPoint[]
}

function CreateBuiltinDeviceModel(config: BuiltinDeviceModelConfig): IDeviceModel {
  const dataPoints = [...config.statusDataPoints, ...config.controlDataPoints]
  return {
    id: config.id,
    name: config.name,
    type: config.type,
    version: 'v1.0.0',
    description: config.description,
    vendor: config.vendor,
    deviceModel: config.deviceModel,
    typeIdentifier: `DSDK:${config.type}/${config.vendor}/${config.deviceModel}`,
    sourceFile: config.sourceFile,
    dataPoints,
    statusDataPoints: config.statusDataPoints,
    controlDataPoints: config.controlDataPoints,
    dataPointCount: dataPoints.length,
    createdAt: '2026-08-07',
    status: 'synced',
    tags: [],
    interfaces: config.interfaces,
  }
}

const COVI_STATUS_DATA_POINTS: IDataPoint[] = [
  { id: 'covi-status-coValue', name: '一氧化碳浓度', identifier: 'coValue', dataType: 'int', access: 'readonly', unit: 'ppm', range: '≥ 0', description: '设备采集的一氧化碳浓度' },
  { id: 'covi-status-viValue', name: '能见度衰减系数', identifier: 'viValue', dataType: 'int', access: 'readonly', unit: '1/km', range: '≥ 0', description: '设备采集的能见度衰减系数' },
]

const OUTSIDE_BRIGHTNESS_STATUS_DATA_POINTS: IDataPoint[] = [
  { id: 'outSideBrightness-status-brightness', name: '洞外亮度', identifier: 'brightness', dataType: 'float', access: 'readonly', unit: 'cd/m2', range: '0 ~ 6500', description: '4-20 mA 输入换算后的洞外亮度' },
  { id: 'outSideBrightness-status-fault', name: '设备故障', identifier: 'fault', dataType: 'bool', access: 'readonly', unit: '', range: 'false/true', description: '亮度计故障反馈状态' },
]

const ROLL_DOOR_STATUS_DATA_POINTS: IDataPoint[] = [
  { id: 'rollDoor-status-status', name: '门体位置', identifier: 'status', dataType: 'enum', access: 'readonly', unit: '', range: 'up/mid/down', description: '卷帘门当前限位状态' },
  { id: 'rollDoor-status-fault', name: '设备故障', identifier: 'fault', dataType: 'bool', access: 'readonly', unit: '', range: 'false/true', description: '卷帘门故障反馈状态' },
]

const ROLL_DOOR_CONTROL_DATA_POINTS: IDataPoint[] = [
  { id: 'rollDoor-control-status', name: '控制命令', identifier: 'status', dataType: 'enum', access: 'readwrite', unit: '', range: 'open/close/stop', description: '卷帘门动作控制命令' },
]

const TWO_LANE_INDICATOR_STATUS_DATA_POINTS: IDataPoint[] = [
  { id: 'twoLaneIndicator-status-status', name: '车道指示状态', identifier: 'status', dataType: 'enum', access: 'readonly', unit: '', range: 'frontGreenBackRed/frontRedBackGreen/frontRedBackRed/frontOffBackOff', description: '车道指示器正反面当前反馈状态' },
]

const TWO_LANE_INDICATOR_CONTROL_DATA_POINTS: IDataPoint[] = [
  { id: 'twoLaneIndicator-control-status', name: '车道指示状态', identifier: 'status', dataType: 'enum', access: 'readwrite', unit: '', range: 'frontGreenBackRed/frontRedBackGreen/frontRedBackRed/frontOffBackOff', description: '控制车道指示器正反面显示状态' },
]

const THREE_LANE_INDICATOR_STATUS_DATA_POINTS: IDataPoint[] = [
  { id: 'threeLaneIndicator-status-status', name: '车道指示状态', identifier: 'status', dataType: 'enum', access: 'readonly', unit: '', range: 'frontGreenBackRed/frontRedBackGreen/frontRedBackRed/frontOffBackOff/leftArrow', description: '车道指示器正反面当前反馈状态' },
]

const THREE_LANE_INDICATOR_CONTROL_DATA_POINTS: IDataPoint[] = [
  { id: 'threeLaneIndicator-control-status', name: '车道指示状态', identifier: 'status', dataType: 'enum', access: 'readwrite', unit: '', range: 'frontGreenBackRed/frontRedBackGreen/frontRedBackRed/frontOffBackOff/leftArrow', description: '控制车道指示器正反面显示状态' },
]

export const MOCK_DEVICE_MODELS: IDeviceModel[] = [
  CreateBuiltinDeviceModel({
    id: 'dsdk-covi-shangHaiXunFei-UKCODEL-COVI',
    name: '能见度仪',
    type: 'covi',
    vendor: 'shangHaiXunFei',
    deviceModel: 'UKCODEL_COVI',
    description: '用于隧道能见度监测；采用 RS485 Modbus RTU 通信，部署前确认设备地址和采集参数。',
    sourceFile: 'covi_shangHaiXunFei_UKCODEL_COVI.md',
    interfaces: [{ name: 'COVI RS485 通信接口', identifier: 'coviRS485', type: 'RS485', defaultConfig: [-1, -1, 9600, 8, 1, 'N'], description: '数组依次表示槽位号、通道号、波特率、数据位、停止位和校验位，槽位号范围 1-6' }],
    statusDataPoints: COVI_STATUS_DATA_POINTS,
    controlDataPoints: [],
  }),
  CreateBuiltinDeviceModel({
    id: 'dsdk-outSideBrightness-shangHaiXunFei-UKCODEL-LU100-AI',
    name: '亮度计',
    type: 'outSideBrightness',
    vendor: 'shangHaiXunFei',
    deviceModel: 'UKCODEL_LU100_AI',
    description: '用于隧道洞外亮度监测；亮度输入量程为 4-20 mA，部署前确认现场接线。',
    sourceFile: 'outSideBrightness_shangHaiXunFei_UKCODEL_LU100_AI.md',
    interfaces: [
      { name: '洞外亮度电流输入', identifier: 'outSideBrightnessCi', type: 'CI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和电流输入通道号，槽位号范围 1-6，通道号范围 1-8' },
      { name: '亮度计故障反馈', identifier: 'luxFaultDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
    ],
    statusDataPoints: OUTSIDE_BRIGHTNESS_STATUS_DATA_POINTS,
    controlDataPoints: [],
  }),
  CreateBuiltinDeviceModel({
    id: 'dsdk-rollDoor-hangZhouXinXin-XX-SV-001',
    name: '卷帘门',
    type: 'rollDoor',
    vendor: 'hangZhouXinXin',
    deviceModel: 'XX-SV-001',
    description: '用于隧道卷帘门状态监测和控制；控制输出为约 2 秒脉冲，部署前确认现场接线。',
    sourceFile: 'rollDoor_hangZhouXinXin_XX-SV-001.md',
    interfaces: [
      { name: '开门控制', identifier: 'openRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '停止控制', identifier: 'stopRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '关门控制', identifier: 'closeRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '上限位反馈', identifier: 'upLimitDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '下限位反馈', identifier: 'downLimitDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '故障反馈', identifier: 'faultDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    ],
    statusDataPoints: ROLL_DOOR_STATUS_DATA_POINTS,
    controlDataPoints: ROLL_DOOR_CONTROL_DATA_POINTS,
  }),
  CreateBuiltinDeviceModel({
    id: 'dsdk-threeLaneIndicator-shangHaiSanSi-SS-C0720-3',
    name: '车道指示器',
    type: 'threeLaneIndicator',
    vendor: 'shangHaiSanSi',
    deviceModel: 'SS-C0720_3',
    description: '用于隧道车道通行状态指示；提供正反面红绿箭头灯控制与反馈，部署前确认设备地址和现场接线。',
    sourceFile: 'threeLaneIndicator_shangHaiSanSi_SS-C0720_3.md',
    interfaces: [
      { name: '正面绿灯控制', identifier: 'frontGreenCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '正面红灯控制', identifier: 'frontRedCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '反面绿灯控制', identifier: 'backGreenCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '反面红灯控制', identifier: 'backRedCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '正面绿灯反馈', identifier: 'frontGreenCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '正面红灯反馈', identifier: 'frontRedCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '反面绿灯反馈', identifier: 'backGreenCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '反面红灯反馈', identifier: 'backRedCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '左箭头控制', identifier: 'leftArrorwDo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
      { name: '左箭头反馈', identifier: 'leftArrorwDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号，槽位号范围 1-6，通道号范围 1-16' },
    ],
    statusDataPoints: THREE_LANE_INDICATOR_STATUS_DATA_POINTS,
    controlDataPoints: THREE_LANE_INDICATOR_CONTROL_DATA_POINTS,
  }),
  CreateBuiltinDeviceModel({
    id: 'dsdk-twoLaneIndicator-shangHaiSanSi-SS-C0720-2',
    name: '车道指示器',
    type: 'twoLaneIndicator',
    vendor: 'shangHaiSanSi',
    deviceModel: 'SS-C0720_2',
    description: '用于隧道车道通行状态指示；提供正反面红绿灯控制与反馈，部署前确认设备地址和现场接线。',
    sourceFile: 'twoLaneIndicator_shangHaiSanSi_SS-C0720_2.md',
    interfaces: [
      { name: '正面绿灯控制', identifier: 'frontGreenCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '正面红灯控制', identifier: 'frontRedCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '反面绿灯控制', identifier: 'backGreenCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '反面红灯控制', identifier: 'backRedCtrlRo', type: 'DO', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '正面绿灯反馈', identifier: 'frontGreenCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '正面红灯反馈', identifier: 'frontRedCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '反面绿灯反馈', identifier: 'backGreenCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
      { name: '反面红灯反馈', identifier: 'backRedCtrlDi', type: 'DI', defaultConfig: [-1, -1], description: '数组依次表示槽位号和通道号' },
    ],
    statusDataPoints: TWO_LANE_INDICATOR_STATUS_DATA_POINTS,
    controlDataPoints: TWO_LANE_INDICATOR_CONTROL_DATA_POINTS,
  }),
]

export const MOCK_CLOUD_DEVICE_MODELS: IDeviceModel[] = [
  {
    id: 'cloud-dm-1',
    name: '工业网关 CT16 标准模型',
    type: '控制器',
    version: 'v2.1',
    description: '适用于 CT16 控制器的标准云端设备模型，包含基础状态、网络状态和 IO 控制数据点。',
    dataPoints: [
      { id: 'cloud-dp-1-1', name: '设备在线状态', identifier: 'online_status', dataType: 'bool', access: 'readonly', unit: '', range: '0/1', description: '设备在线状态' },
      { id: 'cloud-dp-1-2', name: 'CPU使用率', identifier: 'cpu_usage', dataType: 'float', access: 'readonly', unit: '%', range: '0 ~ 100', description: '控制器 CPU 使用率' },
      { id: 'cloud-dp-1-3', name: 'DO输出控制', identifier: 'do_control', dataType: 'int', access: 'readwrite', unit: '', range: '0 ~ 65535', description: '数字量输出位控制' },
    ],
    dataPointCount: 3,
    createdAt: '2026-06-12',
    status: 'synced',
    tags: ['CT16', '控制器', '云端'],
  },
  {
    id: 'cloud-dm-2',
    name: 'Modbus RTU 通用采集模型',
    type: '仪表',
    version: 'v1.5',
    description: '云平台通用 Modbus RTU 采集模型，适用于电表、流量计、压力表等常见工业仪表。',
    dataPoints: [
      { id: 'cloud-dp-2-1', name: '寄存器值1', identifier: 'register_1', dataType: 'float', access: 'readonly', unit: '', range: '', description: '通用寄存器采集值' },
      { id: 'cloud-dp-2-2', name: '采集周期', identifier: 'poll_interval', dataType: 'int', access: 'readwrite', unit: 'ms', range: '100 ~ 60000', description: 'Modbus 轮询周期' },
    ],
    dataPointCount: 2,
    createdAt: '2026-05-28',
    status: 'synced',
    tags: ['Modbus', '仪表', '采集'],
  },
  {
    id: 'cloud-dm-3',
    name: '边缘 AI 状态监测模型',
    type: '传感器',
    version: 'v1.0',
    description: '用于端侧智能体状态监测的云端模型，包含推理耗时、置信度、告警状态等数据点。',
    dataPoints: [
      { id: 'cloud-dp-3-1', name: '推理耗时', identifier: 'infer_latency', dataType: 'float', access: 'readonly', unit: 'ms', range: '0 ~ 10000', description: '端侧模型推理耗时' },
      { id: 'cloud-dp-3-2', name: '置信度', identifier: 'confidence', dataType: 'float', access: 'readonly', unit: '%', range: '0 ~ 100', description: '最近一次识别结果置信度' },
      { id: 'cloud-dp-3-3', name: '告警状态', identifier: 'alarm_status', dataType: 'bool', access: 'readonly', unit: '', range: '0/1', description: 'AI 识别告警状态' },
    ],
    dataPointCount: 3,
    createdAt: '2026-06-20',
    status: 'synced',
    tags: ['AI', '智能体', '云端'],
  },
]

export function GetStatusDataPoints(model: IDeviceModel | undefined): IDataPoint[] {
  return model?.statusDataPoints || model?.dataPoints.filter((dataPoint) => dataPoint.access === 'readonly') || []
}

export function GetControlDataPoints(model: IDeviceModel | undefined): IDataPoint[] {
  return model?.controlDataPoints || model?.dataPoints.filter((dataPoint) => dataPoint.access === 'readwrite') || []
}

export function GetAllDataPoints(model: IDeviceModel | undefined): IDataPoint[] {
  if (!model) {
    return []
  }
  return [...GetStatusDataPoints(model), ...GetControlDataPoints(model)]
}
