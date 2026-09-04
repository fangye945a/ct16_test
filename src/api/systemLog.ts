import { getSessionToken, CT16_API_BASE } from './client'

/** 创建系统日志 SSE 流式连接，返回 EventSource 以控制生命周期 */
export function connectSystemLogStream(
  onLine: (line: string) => void,
): EventSource {
  const query = new URLSearchParams()
  const token = getSessionToken()
  if (token) query.set('token', token)

  const url = `${CT16_API_BASE}/api/logs/system/stream?${query.toString()}`
  const es = new EventSource(url)

  es.onmessage = (event: MessageEvent) => {
    onLine(event.data)
  }

  return es
}

/** 停止系统日志流连接 */
export function disconnectSystemLogStream(es: EventSource | null): void {
  if (es) {
    es.close()
  }
}
