// EXPORTS: ISystemInfo, ISystemMetrics, IAlertEvent, MOCK_SYSTEM_INFO, MOCK_SYSTEM_METRICS, MOCK_ALERT_EVENTS

/**
 * 系统基本信息实体
 */
export interface ISystemInfo {
  id: string
  deviceName: string
  model: string
  serialNumber: string
  systemVersion: string
  firmwareVersion: string
  startedAt: string // ISO 日期字符串，用于计算运行时长
}

/**
 * 系统实时指标实体
 */
export interface ISystemMetrics {
  id: string
  cpuUsage: number // 0-100
  memoryUsage: number // 0-100
  diskUsage: number // 0-100
  networkIn: number // Mbps
  networkOut: number // Mbps
  cpuTrend: number[] // 近10个采样点
  memoryTrend: number[]
  diskTrend: number[]
  networkTrend: number[]
  overallStatus: 'normal' | 'warning' | 'error'
}

/**
 * 系统告警/事件实体
 */
export interface IAlertEvent {
  id: string
  timestamp: string
  level: 'warning' | 'error'
  source: string
  message: string
}

// ==================== Mock 数据 ====================

export const MOCK_SYSTEM_INFO: ISystemInfo = {
  id: '1',
  deviceName: '在鸿控制器',
  model: 'CT16',
  serialNumber: 'SN-2024X8A1',
  systemVersion: 'OpenHarmony 6.1 Release',
  firmwareVersion: 'v2.1.4',
  startedAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(), // 15天前启动
}

export const MOCK_SYSTEM_METRICS: ISystemMetrics = {
  id: '1',
  cpuUsage: 34,
  memoryUsage: 62,
  diskUsage: 48,
  networkIn: 12.5,
  networkOut: 4.2,
  cpuTrend: [28, 32, 35, 30, 33, 36, 34, 38, 35, 34],
  memoryTrend: [58, 60, 61, 63, 62, 64, 63, 65, 62, 62],
  diskTrend: [45, 46, 47, 47, 48, 48, 48, 48, 48, 48],
  networkTrend: [10, 11, 13, 12, 14, 13, 15, 12, 13, 12.5],
  overallStatus: 'normal',
}

export const MOCK_ALERT_EVENTS: IAlertEvent[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
    level: 'warning',
    source: '通信模块',
    message: '4G信号强度低于阈值',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 7200 * 1000).toISOString(),
    level: 'error',
    source: '安全模块',
    message: '检测到异常登录尝试',
  },
]
