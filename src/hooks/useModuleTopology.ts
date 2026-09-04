import { useState, useEffect, useCallback } from 'react'
import {
  getModules,
  portControl,
  portDetect,
  groupDetect,
  analogControl,
  analogDetect,
  getAoSetpoints,
  getUartAttr,
  setUartAttr,
  uartWrite,
  uartRead,
  getNmeaLocation,
} from '@/api'
import type {
  Ct16ModuleInfoDto,
  Ct16ModuleListDto,
  Ct16PortInfoDto,
  Ct16UartAttrDto,
  Ct16NmeaLocationDto,
  Ct16AoSetpointDto,
} from '@/api/types'

// 适配后的模块类型（兼容前端 UI）
export interface ModuleSlotData {
  id: string
  slotNumber: number
  model: string
  name: string
  version: string
  adcValue: number
  type: string // DI 输入 / DO 输出 / AI 输入 / AO 输出 / RS485 通信 / RS232 通信 / NMEA 通信
  spec: string
  status: 'normal' | 'warning' | 'fault' | 'off' | 'empty'
  isOnline: boolean
  channels: number
  channelList: ChannelData[]
  // 后端原始数据
  groupIndex: number
  moduleType: number
  portStatus: number
  funcMask: number
}

export interface ChannelData {
  index: number
  label: string
  status: 'normal' | 'warning' | 'fault' | 'off'
  value: string
  unit: string
}

export interface DetectDigitalResult {
  level: number
  levelStr: string
}

export interface UseModuleTopologyReturn {
  modules: ModuleSlotData[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  togglePort: (group: number, port: number, currentLevel: 0 | 1) => Promise<void>
  setAnalogValue: (group: number, channel: number, moduleType: number, value: number, unit: 'V' | 'mA') => Promise<void>
  getAoSetpoints: (group: number) => Promise<Ct16AoSetpointDto[] | null>
  detectChannel: (group: number, channel: number, moduleType: number) => Promise<{ value: number; unit: string } | null>
  detectDigitalPort: (group: number, port: number) => Promise<DetectDigitalResult | null>
  detectDigitalGroup: (group: number) => Promise<{ statusCode: number } | null>
  getUartConfig: (group: number, chx: number) => Promise<Ct16UartAttrDto | null>
  updateUartConfig: (group: number, chx: number, attr: Ct16UartAttrDto) => Promise<boolean>
  sendUartData: (group: number, chx: number, hexData: string) => Promise<boolean>
  readUartData: (group: number, chx: number) => Promise<string | null>
  queryNmea: (group: number, chx: number) => Promise<Ct16NmeaLocationDto | null>
}

function mapStatus(configStatus: number, isOnline: boolean): ModuleSlotData['status'] {
  if (configStatus === 2) return 'fault'
  if (!isOnline) return 'off'
  if (configStatus === 0) return 'warning'
  return 'normal'
}

function mapChannelStatus(
  portStatus: number,
  index: number,
  funcMask: number,
  category: string,
): ChannelData['status'] {
  if (category === 'NMEA 通信' || category === 'RS485 通信' || category === 'RS232 通信') {
    return 'normal'
  }
  const isOutput = ((funcMask >> index) & 1) === 1
  const isOn = ((portStatus >> index) & 1) === 1
  if (isOutput && isOn) return 'normal'
  if (isOutput && !isOn) return 'off'
  if (!isOutput && isOn) return 'normal'
  if (!isOutput && !isOn) return 'off'
  return 'off'
}

function makeSpec(category: string, channelCount: number): string {
  const specs: Record<string, string> = {
    'DI 输入': `${channelCount}路 NPN/PNP 24VDC`,
    'DO 输出': `${channelCount}路数字量/继电器输出`,
    'AI 输入': `${channelCount}路 4-20mA / 0-10V`,
    'AO 输出': `${channelCount}路 4-20mA / 0-10V`,
    'DI+DO 混合': '混合数字量输入/输出',
    'AI+AO 混合': '混合模拟量输入/输出',
    'RS485 通信': `${channelCount}路 RS485 隔离`,
    'RS232 通信': `${channelCount}路 RS232 隔离`,
    'NMEA 通信': 'NMEA 0183/2000 导航数据接口',
    'PWM 输出': `${channelCount}路 PWM 输出`,
  }
  return specs[category] || `${channelCount} 通道`
}

function mapModuleToSlot(m: Ct16ModuleInfoDto): ModuleSlotData {
  return {
    id: `mod-${m.groupIndex}-${m.moduleId.toString(16)}`,
    slotNumber: m.groupIndex,
    model: m.displayName,
    name: m.displayName,
    version: m.version,
    adcValue: m.adcValue,
    type: m.category,
    spec: makeSpec(m.category, m.channelCount),
    status: mapStatus(m.configStatus, m.isOnline),
    isOnline: m.isOnline,
    channels: m.channelCount,
    channelList: m.ports.map((p: Ct16PortInfoDto) => ({
      index: p.index,
      label: p.label,
      status: mapChannelStatus(m.portStatus, p.index - 1, m.funcMask, m.category),
      value: p.value,
      unit: p.unit,
    })),
    groupIndex: m.groupIndex,
    moduleType: m.moduleType,
    portStatus: m.portStatus,
    funcMask: m.funcMask,
  }
}

export function useModuleTopology(): UseModuleTopologyReturn {
  const [modules, setModules] = useState<ModuleSlotData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadModules = useCallback(async (showLoading: boolean) => {
    if (showLoading) {
      setLoading(true)
      setError(null)
    }
    try {
      const data: Ct16ModuleListDto = await getModules()
      const slots = data.modules
        .filter((m) => m.category !== '其他')
        .sort((a, b) => a.adcValue - b.adcValue)
        .map(mapModuleToSlot)
      setModules(slots)
      setError(slots.length === 0 ? '未检测到 IO 扩展模块' : null)
    } catch (e) {
      if (showLoading) {
        setError(e instanceof Error ? e.message : '获取模块列表失败')
      }
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [])

  const refresh = useCallback(() => loadModules(true), [loadModules])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => {
      void loadModules(false)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [loadModules, refresh])

  const togglePort = useCallback(
    async (group: number, port: number, currentLevel: 0 | 1) => {
      const newLevel = currentLevel === 0 ? 1 : 0
      await portControl(group, port, newLevel as 0 | 1)
      // 本地更新状态，不刷新整个列表（避免跳转和选中状态丢失）
      setModules((prev) =>
        prev.map((m) => {
          if (m.groupIndex !== group) return m
          const newPortStatus =
            newLevel === 1
              ? m.portStatus | (1 << (port - 1))
              : m.portStatus & ~(1 << (port - 1))
          return {
            ...m,
            portStatus: newPortStatus,
            channelList: m.channelList.map((ch) => {
              if (ch.index !== port) return ch
              return {
                ...ch,
                value: newLevel === 1 ? 'ON' : 'OFF',
                status: (newLevel === 1 ? 'normal' : 'off') as ChannelData['status'],
              }
            }),
          }
        }),
      )
    },
    [],
  )

  const setAnalogValue = useCallback(
    async (group: number, channel: number, moduleType: number, value: number, unit: 'V' | 'mA') => {
      await analogControl(group, channel, moduleType, value, unit)
    },
    [],
  )

  const getAoOutputSetpoints = useCallback(async (group: number): Promise<Ct16AoSetpointDto[] | null> => {
    try {
      const resp = await getAoSetpoints(group)
      return resp.channels
    } catch {
      return null
    }
  }, [])

  const detectChannel = useCallback(
    async (group: number, channel: number, moduleType: number) => {
      try {
        const resp = await analogDetect(group, channel, moduleType)
        return { value: resp.value, unit: resp.unit }
      } catch {
        return null
      }
    },
    [],
  )

  const detectDigitalPort = useCallback(
    async (group: number, port: number) => {
      try {
        const resp = await portDetect(group, port)
        return { level: resp.level, levelStr: resp.levelStr }
      } catch {
        return null
      }
    },
    [],
  )

  const detectDigitalGroup = useCallback(
    async (group: number) => {
      try {
        const resp = await groupDetect(group)
        return { statusCode: resp.statusCode }
      } catch {
        return null
      }
    },
    [],
  )

  const getUartConfig = useCallback(async (group: number, chx: number): Promise<Ct16UartAttrDto | null> => {
    try {
      const resp = await getUartAttr(group, chx)
      return resp.attr
    } catch {
      return null
    }
  }, [])

  const updateUartConfig = useCallback(
    async (group: number, chx: number, attr: Ct16UartAttrDto): Promise<boolean> => {
      try {
        await setUartAttr(group, chx, attr)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const sendUartData = useCallback(
    async (group: number, chx: number, hexData: string): Promise<boolean> => {
      try {
        await uartWrite(group, chx, hexData)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const readUartData = useCallback(
    async (group: number, chx: number): Promise<string | null> => {
      try {
        const resp = await uartRead(group, chx)
        return resp.hexData
      } catch {
        return null
      }
    },
    [],
  )

  const queryNmea = useCallback(
    async (group: number, chx: number): Promise<Ct16NmeaLocationDto | null> => {
      try {
        const resp = await getNmeaLocation(group, chx)
        return resp.location
      } catch {
        return null
      }
    },
    [],
  )

  return {
    modules,
    loading,
    error,
    refresh,
    togglePort,
    setAnalogValue,
    getAoSetpoints: getAoOutputSetpoints,
    detectChannel,
    detectDigitalPort,
    detectDigitalGroup,
    getUartConfig,
    updateUartConfig,
    sendUartData,
    readUartData,
    queryNmea,
  }
}
