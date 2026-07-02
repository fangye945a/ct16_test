// EXPORTS: INodeRedNode, INodeRedConnection, INodeRedFlow, INodePaletteCategory, MOCK_NODE_PALETTE, MOCK_FLOWS

export interface INodeRedNode {
  id: string
  type: string
  category: string
  label: string
  icon: string
  x: number
  y: number
  config: Record<string, string>
}

export interface INodeRedConnection {
  id: string
  sourceId: string
  sourcePort: string
  targetId: string
  targetPort: string
}

export interface INodeRedFlow {
  id: string
  name: string
  description: string
  nodes: INodeRedNode[]
  connections: INodeRedConnection[]
}

export interface INodePaletteCategory {
  name: string
  icon: string
  nodes: { type: string; label: string; icon: string; color: string }[]
}

export const MOCK_NODE_PALETTE: INodePaletteCategory[] = [
  {
    name: '输入',
    icon: 'ArrowDownToLine',
    nodes: [
      { type: 'inject', label: 'Inject', icon: 'Zap', color: '#6366F1' },
      { type: 'mqtt-in', label: 'MQTT 输入', icon: 'Radio', color: '#6366F1' },
      { type: 'modbus-in', label: 'Modbus 读取', icon: 'Cable', color: '#6366F1' },
      { type: 'http-in', label: 'HTTP 输入', icon: 'Globe', color: '#6366F1' },
    ],
  },
  {
    name: '输出',
    icon: 'ArrowUpFromLine',
    nodes: [
      { type: 'mqtt-out', label: 'MQTT 发布', icon: 'Radio', color: '#00B894' },
      { type: 'modbus-out', label: 'Modbus 写入', icon: 'Cable', color: '#00B894' },
      { type: 'http-out', label: 'HTTP 响应', icon: 'Globe', color: '#00B894' },
      { type: 'debug', label: 'Debug', icon: 'Bug', color: '#00B894' },
    ],
  },
  {
    name: '逻辑',
    icon: 'GitBranch',
    nodes: [
      { type: 'switch', label: 'Switch', icon: 'ArrowLeftRight', color: '#00B894' },
      { type: 'change', label: 'Change', icon: 'Pencil', color: '#00B894' },
      { type: 'function', label: 'Function', icon: 'Code2', color: '#00B894' },
    ],
  },
  {
    name: '数据转换',
    icon: 'ArrowLeftRight',
    nodes: [
      { type: 'template', label: 'Template', icon: 'FileCode', color: '#00B894' },
      { type: 'json', label: 'JSON 解析', icon: 'Braces', color: '#00B894' },
      { type: 'csv', label: 'CSV 解析', icon: 'Table', color: '#00B894' },
    ],
  },
  {
    name: '网络',
    icon: 'Network',
    nodes: [
      { type: 'tcp-in', label: 'TCP 输入', icon: 'Server', color: '#6366F1' },
      { type: 'tcp-out', label: 'TCP 输出', icon: 'Server', color: '#6366F1' },
      { type: 'udp', label: 'UDP', icon: 'Wifi', color: '#6366F1' },
    ],
  },
  {
    name: '工业协议',
    icon: 'Factory',
    nodes: [
      { type: 'opcua', label: 'OPC UA', icon: 'Cpu', color: '#00B894' },
      { type: 's7', label: 'Siemens S7', icon: 'Microchip', color: '#00B894' },
      { type: 'bacnet', label: 'BACnet', icon: 'Building2', color: '#00B894' },
    ],
  },
];

export const MOCK_FLOWS: INodeRedFlow[] = [
  {
    id: 'flow-1',
    name: '传感器数据采集',
    description: 'Modbus 传感器数据采集 → 边缘过滤 → MQTT 上报',
    nodes: [
      { id: 'n1', type: 'modbus-in', category: '输入', label: 'Modbus 读取', icon: 'Cable', x: 120, y: 200, config: { host: '192.168.1.100', port: '502', unitId: '1', register: '30001' } },
      { id: 'n2', type: 'function', category: '逻辑', label: '数据过滤', icon: 'Code2', x: 320, y: 200, config: { code: 'if (msg.payload > 0) return msg;' } },
      { id: 'n3', type: 'json', category: '数据转换', label: 'JSON 格式化', icon: 'Braces', x: 520, y: 200, config: { action: 'stringify' } },
      { id: 'n4', type: 'mqtt-out', category: '输出', label: 'MQTT 发布', icon: 'Radio', x: 720, y: 200, config: { broker: 'mqtt.cloudiot.com', topic: 'sensor/data' } },
      { id: 'n5', type: 'debug', category: '输出', label: 'Debug', icon: 'Bug', x: 720, y: 320, config: { output: 'msg.payload' } },
    ],
    connections: [
      { id: 'c1', sourceId: 'n1', sourcePort: 'out', targetId: 'n2', targetPort: 'in' },
      { id: 'c2', sourceId: 'n2', sourcePort: 'out', targetId: 'n3', targetPort: 'in' },
      { id: 'c3', sourceId: 'n3', sourcePort: 'out', targetId: 'n4', targetPort: 'in' },
      { id: 'c4', sourceId: 'n3', sourcePort: 'out', targetId: 'n5', targetPort: 'in' },
    ],
  },
  {
    id: 'flow-2',
    name: '告警联动',
    description: '阈值检测 → 告警判断 → 消息推送',
    nodes: [
      { id: 'n1', type: 'inject', category: '输入', label: '定时触发', icon: 'Zap', x: 120, y: 150, config: { interval: '60s' } },
      { id: 'n2', type: 'opcua', category: '工业协议', label: 'OPC UA 读取', icon: 'Cpu', x: 320, y: 150, config: { endpoint: 'opc.tcp://192.168.1.50:4840', nodeId: 'ns=2;s=Temperature' } },
      { id: 'n3', type: 'switch', category: '逻辑', label: '阈值判断', icon: 'ArrowLeftRight', x: 520, y: 150, config: { property: 'payload', rules: '> 80' } },
      { id: 'n4', type: 'http-out', category: '输出', label: '告警推送', icon: 'Globe', x: 720, y: 100, config: { url: 'https://alert.example.com/webhook', method: 'POST' } },
      { id: 'n5', type: 'debug', category: '输出', label: '日志记录', icon: 'Bug', x: 720, y: 220, config: { output: 'msg.payload' } },
    ],
    connections: [
      { id: 'c1', sourceId: 'n1', sourcePort: 'out', targetId: 'n2', targetPort: 'in' },
      { id: 'c2', sourceId: 'n2', sourcePort: 'out', targetId: 'n3', targetPort: 'in' },
      { id: 'c3', sourceId: 'n3', sourcePort: 'out1', targetId: 'n4', targetPort: 'in' },
      { id: 'c4', sourceId: 'n3', sourcePort: 'out2', targetId: 'n5', targetPort: 'in' },
    ],
  },
];
