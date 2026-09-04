import { CT16_API_BASE, ct16AuthRequest } from './client'

/** 请求设备异步重启。 */
export async function requestSystemReboot(): Promise<void> {
  await ct16AuthRequest('/api/system/reboot', { method: 'POST' })
}

/** 探测设备后端是否已经恢复响应。 */
export async function probeSystemHealth(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(`${CT16_API_BASE}/healthz?reboot-check=${Date.now()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    })
    return response.ok
  } catch {
    return false
  }
}
