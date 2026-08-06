// EXPORTS: IDeviceModel, IDataPoint, MOCK_DEVICE_MODELS, MOCK_CLOUD_DEVICE_MODELS

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

export interface IDeviceModel {
  id: string
  name: string
  type: string
  version: string
  description: string
  vendor?: string
  deviceModel?: string
  typeIdentifier?: string
  protocolDescription?: string
  sourceFile?: string
  dataPoints: IDataPoint[]
  dataPointCount: number
  createdAt: string
  status: 'synced' | 'unsynced'
  tags: string[]
}

export const MOCK_DEVICE_MODELS: IDeviceModel[] = [
  {
    id: 'dm-1',
    name: '温湿度传感器',
    type: '传感器',
    version: 'v1.0',
    description: '工业级温湿度传感器设备模型，支持 Modbus RTU 协议，适用于环境监测场景。',
    dataPoints: [
      { id: 'dp-1-1', name: '温度', identifier: 'temperature', dataType: 'float', access: 'readonly', unit: '℃', range: '-40 ~ 85', description: '环境温度值' },
      { id: 'dp-1-2', name: '湿度', identifier: 'humidity', dataType: 'float', access: 'readonly', unit: '%RH', range: '0 ~ 100', description: '环境相对湿度' },
      { id: 'dp-1-3', name: '露点温度', identifier: 'dew_point', dataType: 'float', access: 'readonly', unit: '℃', range: '-60 ~ 60', description: '计算得出的露点温度' },
      { id: 'dp-1-4', name: '设备地址', identifier: 'device_addr', dataType: 'int', access: 'readwrite', unit: '', range: '1 ~ 247', description: 'Modbus 从站地址' },
      { id: 'dp-1-5', name: '波特率', identifier: 'baud_rate', dataType: 'enum', access: 'readwrite', unit: '', range: '9600/19200/38400/115200', description: '串口通信波特率' },
      { id: 'dp-1-6', name: '采样周期', identifier: 'sample_interval', dataType: 'int', access: 'readwrite', unit: 'ms', range: '100 ~ 60000', description: '传感器采样间隔' },
      { id: 'dp-1-7', name: '温度偏移', identifier: 'temp_offset', dataType: 'float', access: 'readwrite', unit: '℃', range: '-10 ~ 10', description: '温度校准偏移量' },
      { id: 'dp-1-8', name: '设备状态', identifier: 'device_status', dataType: 'int', access: 'readonly', unit: '', range: '0 ~ 3', description: '0=正常 1=告警 2=故障 3=离线' },
    ],
    dataPointCount: 8,
    createdAt: '2025-03-15',
    status: 'synced',
    tags: ['温湿度', '传感器', 'Modbus'],
  },
  {
    id: 'dm-2',
    name: '压力变送器',
    type: '传感器',
    version: 'v1.2',
    description: '高精度压力变送器模型，支持 4-20mA 模拟量输入，适用于管道压力监测。',
    dataPoints: [
      { id: 'dp-2-1', name: '压力值', identifier: 'pressure', dataType: 'float', access: 'readonly', unit: 'MPa', range: '0 ~ 2.5', description: '当前压力测量值' },
      { id: 'dp-2-2', name: '量程上限', identifier: 'range_max', dataType: 'float', access: 'readwrite', unit: 'MPa', range: '0.1 ~ 10', description: '传感器量程上限' },
      { id: 'dp-2-3', name: '量程下限', identifier: 'range_min', dataType: 'float', access: 'readwrite', unit: 'MPa', range: '0 ~ 5', description: '传感器量程下限' },
      { id: 'dp-2-4', name: '阻尼系数', identifier: 'damping', dataType: 'float', access: 'readwrite', unit: 's', range: '0 ~ 60', description: '输出信号阻尼时间' },
      { id: 'dp-2-5', name: '设备状态', identifier: 'status', dataType: 'int', access: 'readonly', unit: '', range: '0 ~ 3', description: '设备运行状态' },
    ],
    dataPointCount: 5,
    createdAt: '2025-04-02',
    status: 'synced',
    tags: ['压力', '变送器', 'AI'],
  },
  {
    id: 'dm-3',
    name: '电力仪表',
    type: '仪表',
    version: 'v2.0',
    description: '多功能电力仪表模型，支持三相电力参数采集，适用于配电监控。',
    dataPoints: [
      { id: 'dp-3-1', name: 'A相电压', identifier: 'voltage_a', dataType: 'float', access: 'readonly', unit: 'V', range: '0 ~ 500', description: 'A相电压有效值' },
      { id: 'dp-3-2', name: 'B相电压', identifier: 'voltage_b', dataType: 'float', access: 'readonly', unit: 'V', range: '0 ~ 500', description: 'B相电压有效值' },
      { id: 'dp-3-3', name: 'C相电压', identifier: 'voltage_c', dataType: 'float', access: 'readonly', unit: 'V', range: '0 ~ 500', description: 'C相电压有效值' },
      { id: 'dp-3-4', name: 'A相电流', identifier: 'current_a', dataType: 'float', access: 'readonly', unit: 'A', range: '0 ~ 100', description: 'A相电流有效值' },
      { id: 'dp-3-5', name: 'B相电流', identifier: 'current_b', dataType: 'float', access: 'readonly', unit: 'A', range: '0 ~ 100', description: 'B相电流有效值' },
      { id: 'dp-3-6', name: 'C相电流', identifier: 'current_c', dataType: 'float', access: 'readonly', unit: 'A', range: '0 ~ 100', description: 'C相电流有效值' },
      { id: 'dp-3-7', name: '有功功率', identifier: 'active_power', dataType: 'float', access: 'readonly', unit: 'kW', range: '0 ~ 9999', description: '三相总有功功率' },
      { id: 'dp-3-8', name: '功率因数', identifier: 'power_factor', dataType: 'float', access: 'readonly', unit: '', range: '0 ~ 1', description: '功率因数' },
      { id: 'dp-3-9', name: '频率', identifier: 'frequency', dataType: 'float', access: 'readonly', unit: 'Hz', range: '45 ~ 65', description: '电网频率' },
      { id: 'dp-3-10', name: '正向有功电能', identifier: 'energy_forward', dataType: 'float', access: 'readonly', unit: 'kWh', range: '0 ~ 999999', description: '正向有功累计电能' },
      { id: 'dp-3-11', name: 'CT变比', identifier: 'ct_ratio', dataType: 'int', access: 'readwrite', unit: '', range: '1 ~ 5000', description: '电流互感器变比' },
      { id: 'dp-3-12', name: 'PT变比', identifier: 'pt_ratio', dataType: 'int', access: 'readwrite', unit: '', range: '1 ~ 5000', description: '电压互感器变比' },
    ],
    dataPointCount: 12,
    createdAt: '2025-05-10',
    status: 'unsynced',
    tags: ['电力', '仪表', '三相'],
  },
  {
    id: 'dm-4',
    name: '变频器',
    type: '驱动器',
    version: 'v1.1',
    description: '通用变频器设备模型，支持 Modbus 通信，适用于电机调速控制。',
    dataPoints: [
      { id: 'dp-4-1', name: '运行频率', identifier: 'run_freq', dataType: 'float', access: 'readwrite', unit: 'Hz', range: '0 ~ 50', description: '当前运行频率' },
      { id: 'dp-4-2', name: '设定频率', identifier: 'set_freq', dataType: 'float', access: 'readwrite', unit: 'Hz', range: '0 ~ 50', description: '目标设定频率' },
      { id: 'dp-4-3', name: '输出电流', identifier: 'output_current', dataType: 'float', access: 'readonly', unit: 'A', range: '0 ~ 100', description: '变频器输出电流' },
      { id: 'dp-4-4', name: '输出电压', identifier: 'output_voltage', dataType: 'float', access: 'readonly', unit: 'V', range: '0 ~ 380', description: '变频器输出电压' },
      { id: 'dp-4-5', name: '电机转速', identifier: 'motor_speed', dataType: 'int', access: 'readonly', unit: 'rpm', range: '0 ~ 3000', description: '电机实际转速' },
      { id: 'dp-4-6', name: '运行状态', identifier: 'run_status', dataType: 'int', access: 'readonly', unit: '', range: '0 ~ 5', description: '0=停止 1=正转 2=反转 3=故障 4=待机' },
      { id: 'dp-4-7', name: '启停控制', identifier: 'start_stop', dataType: 'bool', access: 'readwrite', unit: '', range: '0/1', description: '0=停止 1=启动' },
      { id: 'dp-4-8', name: '加速时间', identifier: 'accel_time', dataType: 'float', access: 'readwrite', unit: 's', range: '0.1 ~ 3600', description: '从0到最大频率的加速时间' },
      { id: 'dp-4-9', name: '减速时间', identifier: 'decel_time', dataType: 'float', access: 'readwrite', unit: 's', range: '0.1 ~ 3600', description: '从最大频率到0的减速时间' },
      { id: 'dp-4-10', name: '故障代码', identifier: 'fault_code', dataType: 'int', access: 'readonly', unit: '', range: '0 ~ 99', description: '当前故障代码，0=无故障' },
      { id: 'dp-4-11', name: '母线电压', identifier: 'dc_bus_voltage', dataType: 'float', access: 'readonly', unit: 'V', range: '0 ~ 800', description: '直流母线电压' },
      { id: 'dp-4-12', name: '散热器温度', identifier: 'heatsink_temp', dataType: 'float', access: 'readonly', unit: '℃', range: '0 ~ 120', description: '散热器温度' },
      { id: 'dp-4-13', name: 'V/F曲线选择', identifier: 'vf_curve', dataType: 'enum', access: 'readwrite', unit: '', range: '线性/平方/自定义', description: '电压频率曲线类型' },
      { id: 'dp-4-14', name: '载波频率', identifier: 'carrier_freq', dataType: 'float', access: 'readwrite', unit: 'kHz', range: '1 ~ 15', description: 'PWM载波频率' },
      { id: 'dp-4-15', name: '累计运行时间', identifier: 'total_run_time', dataType: 'int', access: 'readonly', unit: 'h', range: '0 ~ 99999', description: '累计运行小时数' },
    ],
    dataPointCount: 15,
    createdAt: '2025-06-01',
    status: 'synced',
    tags: ['变频器', '电机', '驱动器'],
  },
  {
    id: 'dm-5',
    name: '智能电表',
    type: '仪表',
    version: 'v1.0',
    description: '单相智能电表模型，支持 DL/T645 协议，适用于居民和商业用电计量。',
    dataPoints: [
      { id: 'dp-5-1', name: '电压', identifier: 'voltage', dataType: 'float', access: 'readonly', unit: 'V', range: '0 ~ 300', description: '电压有效值' },
      { id: 'dp-5-2', name: '电流', identifier: 'current', dataType: 'float', access: 'readonly', unit: 'A', range: '0 ~ 100', description: '电流有效值' },
      { id: 'dp-5-3', name: '有功功率', identifier: 'power', dataType: 'float', access: 'readonly', unit: 'W', range: '0 ~ 99999', description: '瞬时有功功率' },
      { id: 'dp-5-4', name: '总电能', identifier: 'total_energy', dataType: 'float', access: 'readonly', unit: 'kWh', range: '0 ~ 999999', description: '累计用电量' },
      { id: 'dp-5-5', name: '尖电量', identifier: 'peak_energy', dataType: 'float', access: 'readonly', unit: 'kWh', range: '0 ~ 999999', description: '尖峰时段用电量' },
      { id: 'dp-5-6', name: '峰电量', identifier: 'high_energy', dataType: 'float', access: 'readonly', unit: 'kWh', range: '0 ~ 999999', description: '高峰时段用电量' },
      { id: 'dp-5-7', name: '平电量', identifier: 'flat_energy', dataType: 'float', access: 'readonly', unit: 'kWh', range: '0 ~ 999999', description: '平时段用电量' },
      { id: 'dp-5-8', name: '谷电量', identifier: 'valley_energy', dataType: 'float', access: 'readonly', unit: 'kWh', range: '0 ~ 999999', description: '低谷时段用电量' },
      { id: 'dp-5-9', name: '表号', identifier: 'meter_id', dataType: 'string', access: 'readwrite', unit: '', range: '12位', description: '电表出厂编号' },
      { id: 'dp-5-10', name: '费率数', identifier: 'tariff_count', dataType: 'int', access: 'readwrite', unit: '', range: '1 ~ 4', description: '费率时段数量' },
    ],
    dataPointCount: 10,
    createdAt: '2025-06-15',
    status: 'synced',
    tags: ['电表', '计量', 'DL/T645'],
  },
  {
    id: 'dm-6',
    name: '门禁控制器',
    type: '控制器',
    version: 'v1.3',
    description: '网络型门禁控制器模型，支持 TCP/IP 通信，适用于出入口管理。',
    dataPoints: [
      { id: 'dp-6-1', name: '门状态', identifier: 'door_status', dataType: 'int', access: 'readonly', unit: '', range: '0 ~ 3', description: '0=关闭 1=打开 2=异常 3=常开' },
      { id: 'dp-6-2', name: '锁状态', identifier: 'lock_status', dataType: 'bool', access: 'readonly', unit: '', range: '0/1', description: '0=解锁 1=上锁' },
      { id: 'dp-6-3', name: '远程开锁', identifier: 'remote_unlock', dataType: 'bool', access: 'readwrite', unit: '', range: '0/1', description: '写1触发远程开锁' },
      { id: 'dp-6-4', name: '刷卡记录', identifier: 'card_record', dataType: 'string', access: 'readonly', unit: '', range: '', description: '最近一次刷卡卡号' },
      { id: 'dp-6-5', name: '报警状态', identifier: 'alarm_status', dataType: 'int', access: 'readonly', unit: '', range: '0 ~ 7', description: '位掩码：1=非法闯入 2=门超时 4=胁迫报警' },
      { id: 'dp-6-6', name: '开门延时', identifier: 'open_delay', dataType: 'int', access: 'readwrite', unit: 's', range: '1 ~ 60', description: '开锁后自动上锁延时' },
      { id: 'dp-6-7', name: 'IP地址', identifier: 'ip_address', dataType: 'string', access: 'readwrite', unit: '', range: '', description: '控制器IP地址' },
    ],
    dataPointCount: 7,
    createdAt: '2025-07-01',
    status: 'unsynced',
    tags: ['门禁', '控制器', '安防'],
  },
];

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
];
