import { ct16AuthGet, ct16AuthRequest, getSessionToken, CT16_API_BASE } from './client'

export interface FileEntryDto { path: string; name: string; type: 'file' | 'directory'; size: number; modifiedAt: string }
export interface FilePreviewDto { path: string; content: string; truncated: boolean; binary: boolean; nextOffset: number; fileSize: number }

/** 生成设备SN_时间戳前缀 */
function snPrefix(sn?: string): string {
  const now = new Date()
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `${sn || 'UNKNOWN'}_${ts}`
}

function query(path: string, value: string): string { return `${path}?${new URLSearchParams({ path: value })}` }

export function getFileRoots(): Promise<{ roots: string[]; defaultLogDir: string }> { return ct16AuthGet('/api/files/roots') }
export function listFiles(path: string): Promise<{ entries: FileEntryDto[] }> { return ct16AuthGet(query('/api/files/list', path)) }
export function previewFile(path: string, offset = 0): Promise<FilePreviewDto> {
  const params = new URLSearchParams({ path, offset: String(offset) })
  return ct16AuthGet(`/api/files/preview?${params}`)
}
export function listLogFiles(directory: string): Promise<{ entries: FileEntryDto[] }> { return ct16AuthGet(`/api/logs/files?${new URLSearchParams({ directory })}`) }
export function tailLog(path: string): Promise<FilePreviewDto> { return ct16AuthGet(`/api/logs/tail?${new URLSearchParams({ path, lines: '200' })}`) }

/** 下载单个文件，文件名格式：{SN}_{时间戳}_{原始文件名} */
export async function downloadFile(path: string, log = false, sn?: string): Promise<void> {
  const response = await ct16AuthRequest(`${log ? '/api/logs/download' : '/api/files/download'}?${new URLSearchParams({ path })}`)

  // 从后端 Content-Disposition 响应头中提取原始文件名（确保扩展名正确）
  const cd = response.headers.get('content-disposition')
  let originalName: string
  if (cd) {
    const m = cd.match(/filename="?([^";\n]+)"?/)
    originalName = m ? m[1] : (path.split('/').pop() || 'download')
  } else {
    originalName = path.split('/').pop() || 'download'
  }

  // 强制转为二进制类型 blob，防止 Chrome 对无后缀文件自动追加 .txt
  const blob = new Blob([await response.arrayBuffer()], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${snPrefix(sn)}_${originalName}`
  link.click()
  URL.revokeObjectURL(url)
}

/** 导出多个文件为 zip，可指定下载的 zip 文件名（如：C21KH2612600000018_20260720135945_hilog.zip） */
export async function exportLogFiles(paths: string[], zipName?: string): Promise<void> {
  if (paths.length === 0) return
  const params = new URLSearchParams()
  for (const p of paths) params.append('path', p)
  const token = getSessionToken()
  if (token) params.set('token', token)
  // 把文件名传给后端，覆盖 Content-Disposition 中的 logs-export.zip
  if (zipName) params.set('filename', zipName)

  const link = document.createElement('a')
  link.href = `${CT16_API_BASE}/api/logs/export?${params.toString()}`
  if (zipName) link.download = zipName
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
