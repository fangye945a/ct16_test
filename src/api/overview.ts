import { ct16AuthDelete, ct16AuthGet, ct16Get } from './client'
import type { Ct16AlertHistoryResponseDto, Ct16SystemOverviewDto } from './types'

export function getSystemOverview(): Promise<Ct16SystemOverviewDto> {
  return ct16Get<Ct16SystemOverviewDto>('/api/system/overview')
}

export function getAlertHistory(): Promise<Ct16AlertHistoryResponseDto> {
  return ct16AuthGet<Ct16AlertHistoryResponseDto>('/api/system/alerts')
}

export function deleteAlert(id: string): Promise<{ status: string }> {
  return ct16AuthDelete<{ status: string }>(`/api/system/alerts/${encodeURIComponent(id)}`)
}

export function clearResolvedAlerts(): Promise<{ status: string }> {
  return ct16AuthDelete<{ status: string }>('/api/system/alerts?resolved=true')
}
