import { ct16Get, ct16Post, ct16Put } from './client'
import type {
  Ct16ModuleListDto,
  Ct16PortDetectDto,
  Ct16AnalogDetectDto,
  Ct16AoSetpointsResponseDto,
  Ct16UartAttrDto,
  Ct16UartAttrResponseDto,
  Ct16UartReadResponseDto,
  Ct16NmeaResponseDto,
  Ct16NetworkDeviceListDto,
  Ct16CustomNetworkDeviceListDto,
  Ct16WirelessTopologyDto,
} from './types'

// ===== 模块列表 =====

export function getModules(): Promise<Ct16ModuleListDto> {
  return ct16Get<Ct16ModuleListDto>('/api/topology/modules')
}

export function getWirelessModuleTopology(): Promise<Ct16WirelessTopologyDto> {
  return ct16Get<Ct16WirelessTopologyDto>('/api/topology/wireless-modules')
}

// ===== 端口检测 =====

export function portDetect(group: number, port: number): Promise<Ct16PortDetectDto> {
  return ct16Post<Ct16PortDetectDto>(`/api/topology/modules/${group}/ports/${port}/detect`)
}

// ===== 端口控制 =====

export function portControl(group: number, port: number, level: 0 | 1): Promise<{ status: string }> {
  return ct16Post<{ status: string }>(`/api/topology/modules/${group}/ports/${port}/control`, { level })
}

// ===== 分组检测 =====

export function groupDetect(group: number): Promise<{ statusCode: number }> {
  return ct16Post<{ statusCode: number }>(`/api/topology/modules/${group}/group-detect`)
}

// ===== 分组控制 =====

export function groupControl(group: number, ctrlCode: number, ctrlMask: number): Promise<{ status: string }> {
  return ct16Post<{ status: string }>(`/api/topology/modules/${group}/group-control`, { ctrlCode, ctrlMask })
}

// ===== 模拟量检测 =====

export function analogDetect(
  group: number,
  channel: number,
  moduleType: number,
): Promise<Ct16AnalogDetectDto> {
  return ct16Post<Ct16AnalogDetectDto>(
    `/api/topology/modules/${group}/analog/${channel}/detect`,
    { moduleType },
  )
}

// ===== 模拟量控制 =====

export function analogControl(
  group: number,
  channel: number,
  moduleType: number,
  value: number,
  unit: 'V' | 'mA',
): Promise<{ status: string }> {
  return ct16Post<{ status: string }>(
    `/api/topology/modules/${group}/analog/${channel}/control`,
    { moduleType, value, unit },
  )
}

// ===== AO 输出设定值 =====

export function getAoSetpoints(group: number): Promise<Ct16AoSetpointsResponseDto> {
  return ct16Get<Ct16AoSetpointsResponseDto>(`/api/topology/modules/${group}/ao/setpoints`)
}

// ===== UART 属性 =====

export function getUartAttr(group: number, chx: number): Promise<Ct16UartAttrResponseDto> {
  return ct16Get<Ct16UartAttrResponseDto>(`/api/topology/modules/${group}/uart/${chx}/attr`)
}

export function setUartAttr(
  group: number,
  chx: number,
  attr: Ct16UartAttrDto,
): Promise<{ status: string }> {
  return ct16Put<{ status: string }>(`/api/topology/modules/${group}/uart/${chx}/attr`, { attr })
}

// ===== UART 读写 =====

export function uartWrite(
  group: number,
  chx: number,
  hexData: string,
): Promise<{ status: string }> {
  return ct16Post<{ status: string }>(`/api/topology/modules/${group}/uart/${chx}/write`, { hexData })
}

export function uartRead(group: number, chx: number): Promise<Ct16UartReadResponseDto> {
  return ct16Post<Ct16UartReadResponseDto>(`/api/topology/modules/${group}/uart/${chx}/read`)
}

// ===== NMEA 定位 =====

export function getNmeaLocation(group: number, chx: number): Promise<Ct16NmeaResponseDto> {
  return ct16Get<Ct16NmeaResponseDto>(`/api/topology/modules/${group}/nmea/${chx}`)
}

// ===== 组网拓扑 =====

export function getNetworkDevices(): Promise<Ct16NetworkDeviceListDto> {
  return ct16Get<Ct16NetworkDeviceListDto>('/api/topology/network/devices')
}

// ===== 系统拓扑（含自定义数据）=====

export function getCustomNetworkDevices(): Promise<Ct16CustomNetworkDeviceListDto> {
  return ct16Get<Ct16CustomNetworkDeviceListDto>('/api/topology/network/custom-devices')
}
