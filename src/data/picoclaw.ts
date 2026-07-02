// EXPORTS: ISkill, IAgentConfig, IAgentStats, MOCK_SKILLS, MOCK_MARKET_SKILLS, MOCK_AGENT_CONFIG, MOCK_AGENT_STATS

export interface ISkill {
  id: string
  name: string
  version: string
  status: 'enabled' | 'disabled'
  description: string
  category: string
  imageUrl: string
  config: Record<string, string | number | boolean>
}

export interface IAgentConfig {
  model: string
  contextLength: number
  temperature: number
  maxTokens: number
}

export interface IAgentStats {
  totalCalls: number
  successRate: number
  avgResponseTime: number
  dailyCalls: number[]
  dailyLabels: string[]
}

export const MOCK_AGENT_CONFIG: IAgentConfig = {
  model: 'TinyLLM-1B',
  contextLength: 2048,
  temperature: 0.7,
  maxTokens: 512,
};

export const MOCK_SKILLS: ISkill[] = [
  {
    id: 'skill-1',
    name: '数据过滤',
    version: 'v1.2.0',
    status: 'enabled',
    description: '对传感器数据进行阈值过滤和异常值剔除，减少噪声数据上传',
    category: '数据处理',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixpyedeiq_ve_miaoda',
    config: { threshold: 80, filterRule: 'gaussian', windowSize: 10, enabled: true },
  },
  {
    id: 'skill-2',
    name: '异常检测',
    version: 'v1.0.1',
    status: 'enabled',
    description: '基于统计模型的实时异常检测，支持多维数据联合分析',
    category: '智能分析',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixlpzqihq_ve_miaoda',
    config: { sensitivity: 0.85, algorithm: 'isolation_forest', featureCount: 6, enabled: true },
  },
  {
    id: 'skill-3',
    name: '协议转换',
    version: 'v2.0.3',
    status: 'enabled',
    description: '自动识别和转换多种工业协议，支持 Modbus/OPC UA/MQTT 互转',
    category: '协议处理',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixpyedeiq_ve_miaoda',
    config: { sourceProtocol: 'modbus', targetProtocol: 'mqtt', baudRate: 9600, enabled: true },
  },
  {
    id: 'skill-4',
    name: '边缘推理',
    version: 'v0.9.5',
    status: 'disabled',
    description: '在边缘侧运行轻量级 ML 模型推理，支持 TensorFlow Lite 模型',
    category: 'AI 推理',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixlpzqihq_ve_miaoda',
    config: { modelPath: '/models/anomaly.tflite', inputShape: '1x128', threshold: 0.75, enabled: false },
  },
];

export const MOCK_MARKET_SKILLS: ISkill[] = [
  {
    id: 'market-1',
    name: '时序预测',
    version: 'v1.0.0',
    status: 'disabled',
    description: '基于 LSTM 的时间序列预测，适用于设备健康度预测和趋势分析',
    category: 'AI 推理',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixpyedeiq_ve_miaoda',
    config: {},
  },
  {
    id: 'market-2',
    name: '图像识别',
    version: 'v0.8.0',
    status: 'disabled',
    description: '边缘侧图像分类和目标检测，支持 ONNX 模型格式',
    category: 'AI 推理',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixlpzqihq_ve_miaoda',
    config: {},
  },
  {
    id: 'market-3',
    name: '语音指令',
    version: 'v1.1.0',
    status: 'disabled',
    description: '本地语音指令识别，支持中英文唤醒词和命令词',
    category: '语音处理',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixpyedeiq_ve_miaoda',
    config: {},
  },
  {
    id: 'market-4',
    name: '数据压缩',
    version: 'v2.0.0',
    status: 'disabled',
    description: '高效的有损/无损数据压缩算法，减少带宽占用',
    category: '数据处理',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixlpzqihq_ve_miaoda',
    config: {},
  },
  {
    id: 'market-5',
    name: '规则引擎',
    version: 'v1.3.2',
    status: 'disabled',
    description: '可视化规则配置引擎，支持复杂事件处理和联动触发',
    category: '逻辑处理',
    imageUrl: '/spark/app/app_179arfhh77q/runtime/api/v1/storage/object/bucket_aadkix6bwicbq_static/static%2Faadkixpyedeiq_ve_miaoda',
    config: {},
  },
];

export const MOCK_AGENT_STATS: IAgentStats = {
  totalCalls: 12583,
  successRate: 97.8,
  avgResponseTime: 45,
  dailyCalls: [420, 380, 510, 490, 560, 520, 480, 610, 580, 530, 490, 550, 620, 590, 510, 470, 440, 500, 530, 480, 450, 410, 390, 360],
  dailyLabels: ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'],
};
