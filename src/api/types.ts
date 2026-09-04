export type Ct16StatusLevel = 'normal' | 'warning' | 'error'

export interface Ct16OverviewDeviceDto {
  deviceName: string
  model: string
  serialNumber: string
  systemVersion: string
  firmwareVersion: string
}

export interface Ct16OverviewStatusDto {
  overallStatus: Ct16StatusLevel
  statusMessage: string
  uptimeSeconds: number
  sampledAt: string
}

export interface Ct16OverviewMetricDto {
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkInMbps: number
  networkOutMbps: number
}

export interface Ct16OverviewTrendDto {
  cpu: number[]
  memory: number[]
  disk: number[]
  network: number[]
}

export interface Ct16OverviewAlertDto {
  id: string
  timestamp: string
  resolvedAt?: string
  level: Ct16StatusLevel
  source: string
  message: string
  active: boolean
}

export interface Ct16AlertHistoryResponseDto {
  alerts: Ct16OverviewAlertDto[]
  total: number
}

export interface Ct16SystemOverviewDto {
  device: Ct16OverviewDeviceDto
  status: Ct16OverviewStatusDto
  metrics: Ct16OverviewMetricDto
  trends: Ct16OverviewTrendDto
  alerts: Ct16OverviewAlertDto[]
}

export interface Ct16FeatureAvailabilityDto {
  feature: 'nodered' | 'agent'
  state: 'reserved' | 'available' | 'disabled'
  message: string
}

// ===== 拓扑 DTO =====

export type Ct16ModuleCategory =
  | 'DI 输入' | 'DO 输出' | 'DO 输出'
  | 'AI 输入' | 'AO 输出'
  | 'DI+DO 混合' | 'AI+AO 混合'
  | 'RS485 通信' | 'RS232 通信' | 'NMEA 通信'
  | 'PWM 输出' | '其他'

export interface Ct16PortInfoDto {
  index: number
  label: string
  direction: 'input' | 'output' | 'io'
  value: string
  unit: string
  status: string
}

export interface Ct16ModuleInfoDto {
  groupIndex: number
  moduleId: number
  moduleType: number
  displayName: string
  category: Ct16ModuleCategory
  configStatus: number
  errCode: number
  canIdUp: number
  canIdDown: number
  isOnline: boolean
  version: string
  portStatus: number
  funcMask: number
  adcValue: number
  channelCount: number
  ports: Ct16PortInfoDto[]
}

export interface Ct16ModuleListDto {
  modules: Ct16ModuleInfoDto[]
  totalCount: number
  onlineCount: number
}

export interface Ct16WirelessSlotTopologyDto {
  type: 'wifi' | '4g' | 'ble' | 'sle'
  ipAddress?: string
  signalStrength?: string
  broadcastName?: string
  macAddress?: string
  version?: string
}

export interface Ct16WirelessTopologyDto {
  slot1: Ct16WirelessSlotTopologyDto
  slot2: Ct16WirelessSlotTopologyDto
}

export interface Ct16PortDetectDto {
  groupIndex: number
  portNum: number
  level: number
  levelStr: string
}

export interface Ct16AnalogDetectDto {
  groupIndex: number
  channelNum: number
  value: number
  unit: string
  rawValue: number
}

export interface Ct16AoSetpointDto {
  channelNum: number
  value: number
  unit: 'V' | 'mA'
  rawValue: number
  readSuccess: boolean
}

export interface Ct16AoSetpointsResponseDto {
  groupIndex: number
  channels: Ct16AoSetpointDto[]
}

export interface Ct16UartAttrDto {
  baudRate: number
  stopBits: number
  parity: number
  dataBits: number
}

export interface Ct16UartAttrResponseDto {
  groupIndex: number
  chx: number
  attr: Ct16UartAttrDto
}

export interface Ct16UartReadResponseDto {
  groupIndex: number
  chx: number
  hexData: string
  byteCount: number
}

export interface Ct16NmeaLocationDto {
  latitude: number
  longitude: number
  altitude: number
  geoidHeight: number
  speed: number
  course: number
  locStatus: number
  satCount: number
  utcTime: string
}

export interface Ct16NmeaResponseDto {
  groupIndex: number
  chx: number
  location: Ct16NmeaLocationDto
  satSystem: string
}

// ===== 组网拓扑 / 系统拓扑 DTO =====

export interface Ct16NetworkDeviceDto {
  devId: string
  devName: string
  devVersion: string
  deviceType: string
  onlineStatus: boolean
  role: 'master' | 'slave'
  isLocal: boolean
}

export interface Ct16NetworkDeviceListDto {
  devices: Ct16NetworkDeviceDto[]
  totalCount: number
  onlineCount: number
}

export interface Ct16CustomNetworkDeviceDto extends Ct16NetworkDeviceDto {
  customData: string // base64 编码的自定义数据
}

export interface Ct16CustomNetworkDeviceListDto {
  devices: Ct16CustomNetworkDeviceDto[]
  totalCount: number
  onlineCount: number
}

// ===== 设置 - 网卡网络配置 DTO =====

export interface Ct16NetworkGlobalDto {
  netMode: string
  dnsServers: string
  brMembers: string
}

export interface Ct16NetworkIfaceDto {
  id: string
  name: string
  enabled: boolean
  addressMode: string
  ipAddress: string
  runtimeIpAddress?: string
  runtimeGateway?: string
  subnetMask: string
  gateway: string
  dnsPrimary: string
  dnsSecondary: string
  effectiveDns?: string[]
  metric: string
  defaultRoute: boolean
  ssid?: string
  password?: string
  encryption?: string
  apn?: string
  username?: string
  apnPassword?: string
}

export interface Ct16NetworkSettingsDto {
  ethernetMode: string
  global: Ct16NetworkGlobalDto
  interfaces: Record<string, Ct16NetworkIfaceDto>
}

export interface Ct16NetworkSettingsUpdateDto {
  ethernetMode: string
  interfaces: Record<string, Ct16NetworkIfaceDto>
}

export interface Ct16NetworkApplyDto {
  changedIfaces: string[]
  startIfaces: string[]
  modeChanged: boolean
}

export interface Ct16WirelessModulesDto {
  slot1: 'wifi' | '4g'
  slot2: 'ble' | 'sle'
}

export interface Ct16WirelessInterfaceDto extends Ct16NetworkIfaceDto {
  addressMode: 'auto'
}

// ===== 设置 - 时间设置 DTO =====

export interface Ct16TimeSettingsDto {
  timezone: string  // 时区，如 Asia/Shanghai
  ntpServer: string // NTP 服务器地址
  ntpEnabled: boolean // 是否启用网络时间同步
  systemTime: string // 当前系统时间，格式为 YYYY-MM-DDTHH:mm:ss
}

export interface Ct16TimezoneListDto {
  timezones: string[]
  offsets: Record<string, number>
}

export interface Ct16EsoftbusSettingsDto {
  master: 0 | 1
  deviceId: string
  deviceName: string
  plugCfgDir: string
  hardwareCfgFile: string
  dbRootPath: string
  regionName: string
  interfaces: { eth0: string; eth1: string }
  configPath: string
  hardwareConfigPath: string
}

export type Ct16EsoftbusSettingsUpdateDto = Omit<Ct16EsoftbusSettingsDto, 'hardwareCfgFile' | 'configPath' | 'hardwareConfigPath'>

// ===== 认证 DTO =====

export interface Ct16LoginRequestDto {
  username: string
  password: string
}

export interface Ct16LoginResponseDto {
  token: string
  username: string
}

export interface Ct16AuthStatusDto {
  isLoggedIn: boolean
  isSetup: boolean
  username?: string
}

export interface Ct16ChangePasswordRequestDto {
  currentPassword: string
  newPassword: string
}

// ===== OTA DTO =====

export interface Ct16OtaUploadDto {
  id: string
	fileName: string
	fileSize: number
	lastModified: number
  receivedSize: number
  status: 'uploading' | 'ready' | 'validating' | 'upgrading' | 'succeeded' | 'failed'
  skippedUpload: boolean
  finalPath?: string
  error?: string
  log?: string
  exitCode?: number
  createdAt: string
  updatedAt: string
}

export interface Ct16CreateOtaUploadDto {
	fileName: string
	fileSize: number
	lastModified: number
}
