// EXPORTS: IOtaUpgradeRecord, MOCK_OTA_RECORDS
export interface IOtaUpgradeRecord {
  id: string
  version: string
  buildDate: string
  status: 'success' | 'failed' | 'rolled_back' | 'in_progress'
  operator: string
  upgradeTime: string
  description: string
}

export const MOCK_OTA_RECORDS: IOtaUpgradeRecord[] = [
  {
    id: '1',
    version: 'v3.2.1',
    buildDate: '2025-01-15',
    status: 'success',
    operator: 'Admin',
    upgradeTime: '2025-01-20 14:30:00',
    description: '修复Modbus协议解析异常',
  },
  {
    id: '2',
    version: 'v3.2.0',
    buildDate: '2024-12-20',
    status: 'rolled_back',
    operator: 'Zhang Wei',
    upgradeTime: '2024-12-28 09:15:00',
    description: '新增OPC UA订阅功能',
  },
  {
    id: '3',
    version: 'v3.1.5',
    buildDate: '2024-11-10',
    status: 'failed',
    operator: 'Admin',
    upgradeTime: '2024-11-15 16:45:00',
    description: '安全补丁更新',
  }
]
