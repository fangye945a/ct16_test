import { ct16Get, ct16Put, ct16Post, getSessionToken } from './client'
import type {
  Ct16NetworkSettingsDto,
  Ct16NetworkSettingsUpdateDto,
  Ct16NetworkApplyDto,
  Ct16WirelessModulesDto,
  Ct16WirelessInterfaceDto,
  Ct16TimeSettingsDto,
  Ct16TimezoneListDto,
  Ct16EsoftbusSettingsDto,
  Ct16EsoftbusSettingsUpdateDto,
} from './types'

/** 获取当前网卡网络配置 */
export function getNetworkSettings(options?: RequestInit): Promise<Ct16NetworkSettingsDto> {
  return ct16Get<Ct16NetworkSettingsDto>('/api/settings/network', options)
}

/** 更新网卡网络配置（写入配置文件，不立即生效） */
export function updateNetworkSettings(
  data: Ct16NetworkSettingsUpdateDto,
): Promise<{ status: string }> {
  return ct16Put<{ status: string }>('/api/settings/network', data)
}

/** 应用网卡网络配置（执行 network.sh 脚本） */
export function applyNetworkSettings(
  data: Ct16NetworkApplyDto,
): Promise<{ status: string }> {
  return ct16Post<{ status: string }>('/api/settings/network/apply', data)
}

/** 重置网络配置为出厂默认（删除配置 + network.sh start） */
export function resetNetworkSettings(options?: RequestInit): Promise<{ status: string }> {
  return ct16Post<{ status: string }>('/api/settings/network/reset', undefined, options)
}

export function getWirelessModules(options?: RequestInit): Promise<Ct16WirelessModulesDto> {
  return ct16Get<Ct16WirelessModulesDto>('/api/settings/wireless/modules', options)
}

export function updateWirelessModules(data: Ct16WirelessModulesDto): Promise<{ status: string }> {
  return ct16Put<{ status: string }>('/api/settings/wireless/modules', data)
}

export function getWirelessInterface(id: 'wifi' | '4g', options?: RequestInit): Promise<Ct16WirelessInterfaceDto> {
  return ct16Get<Ct16WirelessInterfaceDto>(`/api/settings/wireless/interfaces/${id}`, options)
}

export function updateWirelessInterface(id: 'wifi' | '4g', data: Ct16WirelessInterfaceDto, signal?: AbortSignal): Promise<{ status: string }> {
  return ct16Put<{ status: string }>(`/api/settings/wireless/interfaces/${id}`, data, { signal })
}

export function applyWirelessSettings(signal?: AbortSignal): Promise<{ status: string }> {
  return ct16Post<{ status: string }>('/api/settings/wireless/apply', undefined, { signal })
}

export function resetWirelessSettings(): Promise<{ status: string }> {
  return ct16Post<{ status: string }>('/api/settings/wireless/reset')
}

/** 获取可用时区列表 */
export function getTimezones(): Promise<Ct16TimezoneListDto> {
  return ct16Get<Ct16TimezoneListDto>('/api/settings/timezones')
}

/** 获取当前时区设置 */
export function getTimeSettings(): Promise<Ct16TimeSettingsDto> {
  return ct16Get<Ct16TimeSettingsDto>('/api/settings/time')
}

/** 设置时区、NTP 服务器和网络时间同步开关 */
export function updateTimeSettings(
  data: { timezone: string; ntpServer: string; ntpEnabled: boolean },
): Promise<{ status: string }> {
  return ct16Put<{ status: string }>('/api/settings/time', data)
}

/** 保存系统时间并立即生效 */
export function updateSystemTime(systemTime: string): Promise<{ status: string }> {
  return ct16Post<{ status: string }>('/api/settings/system-time', { systemTime })
}

/** 获取鸿蒙软总线主配置及 eth0/eth1 硬件配置 */
export function getEsoftbusSettings(): Promise<Ct16EsoftbusSettingsDto> {
  return ct16Get<Ct16EsoftbusSettingsDto>('/api/settings/esoftbus')
}

/** 保存鸿蒙软总线主配置及网卡配置 */
export function updateEsoftbusSettings(data: Ct16EsoftbusSettingsUpdateDto): Promise<{ status: string }> {
  return ct16Put<{ status: string }>('/api/settings/esoftbus', data)
}

/** 重启鸿蒙软总线服务 */
export async function restartEsoftbusService(): Promise<void> {
  const token = getSessionToken()
  if (!token) throw new Error('未登录')
  const response = await fetch('/api/services/esoftbus/restart', {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(payload.error || '重启软总线服务失败')
  }
}

/** 验证管理员密码（不创建新 session） */
export async function verifyPassword(password: string): Promise<void> {
  const token = getSessionToken()
  if (!token) {
    throw new Error('未登录')
  }
  const res = await fetch('/api/auth/verify-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text)
      msg = j.error || text
    } catch {
      // 保持 raw text
    }
    throw new Error(msg)
  }
}

/** 启动系统服务 */
export async function startService(name: string): Promise<void> {
  const token = getSessionToken()
  if (!token) {
    throw new Error('未登录')
  }
  const res = await fetch(`/api/services/${name}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text)
      msg = j.error || text
    } catch {
      // 保持 raw text
    }
    throw new Error(msg)
  }
}

/** 获取 sshd/hdcd 运行状态 */
export async function getServicesStatus(): Promise<{ sshd: boolean; hdcd: boolean }> {
  const res = await fetch('/api/services/status')
  if (!res.ok) {
    throw new Error('获取服务状态失败')
  }
  return res.json()
}

/** 停止系统服务 */
export async function stopService(name: string): Promise<void> {
  const token = getSessionToken()
  if (!token) {
    throw new Error('未登录')
  }
  const res = await fetch(`/api/services/${name}/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text)
      msg = j.error || text
    } catch {
      // 保持 raw text
    }
    throw new Error(msg)
  }
}
