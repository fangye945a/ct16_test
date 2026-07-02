// EXPORTS: ILogEntry, MOCK_LOGS
export interface ILogEntry {
  id: string
  timestamp: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  source: string
  summary: string
  detail: string
}

export const MOCK_LOGS: ILogEntry[] = [
  {
    id: '1',
    timestamp: '2025-01-15 14:32:10',
    level: 'INFO',
    source: 'Modbus服务',
    summary: '设备连接成功',
    detail: 'Modbus TCP 设备 192.168.1.100:502 连接建立成功，寄存器映射加载完成。'
  },
  {
    id: '2',
    timestamp: '2025-01-15 14:30:05',
    level: 'WARN',
    source: '磁盘监控',
    summary: '磁盘使用率超过80%',
    detail: '分区 /data 使用率已达 82.3%，建议清理过期日志文件或扩容存储。当前可用空间: 1.8GB / 10GB。'
  },
  {
    id: '3',
    timestamp: '2025-01-15 14:28:42',
    level: 'ERROR',
    source: 'MQTT Broker',
    summary: '连接云端MQTT失败',
    detail: 'MQTT 连接至 broker.cloudiot.com:8883 失败，错误码: ECONNREFUSED。已触发重连机制，当前重试次数: 3/5。\n堆栈: ConnectionError at mqtt_client.js:234'
  }
]