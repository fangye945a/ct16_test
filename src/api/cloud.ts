import { ct16AuthRequest } from './client'

export type CloudProvider = string
export type CloudConnectionState = 'disabled' | 'connecting' | 'connected' | 'error'
export type CloudActiveEndpoint = '' | 'primary' | 'backup'
export type ZaiohAuthType = 'machine' | 'product' | 'private_key'
export type ZaiohPlatformType = 'cloud' | 'edge'

export interface CloudConnectionSummary {
  id: string
  name: string
  provider: CloudProvider
  enabled: boolean
  state: CloudConnectionState
  lastConnectedAtMs: number
  lastError: string
}

export interface CloudConnectionListResponse {
  connections: CloudConnectionSummary[]
  maxCount: number
}

export interface CloudProviderDescriptor {
  id: string
  displayName: string
  available: boolean
  reason?: string
  capabilities: number
  schema?: Record<string, unknown>
  source: 'builtin' | 'extension' | string
  path: string
  fileName: string
  size: number
  modifiedMs: number
  activeInstances: number
}

export interface CloudEndpointConfig {
  host: string
  port: number
  username: string
  password?: string
  passwordConfigured: boolean
}

export interface CloudEndpointUpdate {
  host: string
  port: number
  username: string
  password?: string | null
}

export interface CloudMQTTConfig {
  enabled: boolean
  cloudType: 'standard_mqtt' | 'ct1x-mqtt'
  clientId: string
  topicPrefix: string
  keepaliveSec: number
  qos: 0 | 1 | 2
  reportIntervalSec: number
  primary: CloudEndpointConfig
  backup: CloudEndpointConfig
  tls: { enabled: boolean }
}

export interface CloudMQTTConfigUpdate extends Omit<CloudMQTTConfig, 'primary' | 'backup'> {
  primary: CloudEndpointUpdate
  backup: CloudEndpointUpdate
}

export interface CloudZaiohConfig {
  enabled: boolean
  authType: ZaiohAuthType
  platformType: ZaiohPlatformType
  profileId: string
  keepaliveSec: number
  reportIntervalSec: number
  primary: CloudEndpointConfig
  backup: CloudEndpointConfig
  primaryRequestUrl: string
  backupRequestUrl: string
  productKey: string
  deviceName: string
  secret?: string
  secretConfigured: boolean
  tls: { enabled: boolean; caFile: string }
}

export interface CloudZaiohConfigUpdate extends Omit<CloudZaiohConfig, 'primary' | 'backup' | 'secretConfigured'> {
  primary: CloudEndpointUpdate
  backup: CloudEndpointUpdate
  secret?: string | null
}

export interface CloudRuntime {
  state: CloudConnectionState
  activeEndpoint: CloudActiveEndpoint
  activeHost: string
  activePort: number
  lastError: string
}

interface CloudConnectionBase {
  id: string
  name: string
  runtime: CloudRuntime
}

export interface CloudMQTTConnection extends CloudConnectionBase {
  provider: 'standard_mqtt' | 'ct1x-mqtt'
  config: CloudMQTTConfig
}

export interface CloudZaiohConnection extends CloudConnectionBase {
  provider: 'zaioh'
  config: CloudZaiohConfig
}

export interface CloudGenericConnection extends CloudConnectionBase {
  provider: string
  config: Record<string, unknown>
}

export type CloudConnection = CloudMQTTConnection | CloudZaiohConnection | CloudGenericConnection

export interface CloudConnectionMutation {
  name: string
  provider: CloudProvider
  config: CloudMQTTConfigUpdate | CloudZaiohConfigUpdate | Record<string, unknown>
}

export async function listCloudProviders(options?: RequestInit): Promise<CloudProviderDescriptor[]> {
  const response = await ct16AuthRequest('/api/cloud/providers', {
    ...options,
    method: 'GET',
    cache: 'no-store',
  })
  return response.json() as Promise<CloudProviderDescriptor[]>
}

export async function listCloudPlugins(options?: RequestInit): Promise<CloudProviderDescriptor[]> {
  const response = await ct16AuthRequest('/api/cloud/plugins', {
    ...options,
    method: 'GET',
    cache: 'no-store',
  })
  return response.json() as Promise<CloudProviderDescriptor[]>
}

export async function uploadCloudPlugin(file: File): Promise<CloudProviderDescriptor[]> {
  const body = new FormData()
  body.append('file', file)
  const response = await ct16AuthRequest('/api/cloud/plugins', { method: 'POST', body })
  return response.json() as Promise<CloudProviderDescriptor[]>
}

export async function deleteCloudPlugin(providerId: string): Promise<void> {
  await ct16AuthRequest(`/api/cloud/plugins/${encodeURIComponent(providerId)}`, { method: 'DELETE' })
}

export type CloudTrafficDirection = '' | 'uplink' | 'downlink'

export interface CloudMqttTrafficRecord {
  sequence: number
  timestampMs: number
  updatedAtMs: number
  mqttMessageId: number
  direction: Exclude<CloudTrafficDirection, ''>
  qos: number
  retain: boolean
  payloadTruncated: boolean
  result: number
  messageType: string
  topic: string
  sn?: string
  status: string
  error?: string
  payload: string
}

export interface CloudMqttTrafficQuery {
  keyword?: string
  direction?: CloudTrafficDirection
  messageType?: string
  sn?: string
  from?: number
  to?: number
  beforeSequence?: number
  limit?: number
}

export interface CloudMqttTrafficResponse {
  records: CloudMqttTrafficRecord[]
  nextCursor: number
  hasMore: boolean
  total: number
  droppedCount: number
}

export async function listCloudConnections(options?: RequestInit): Promise<CloudConnectionListResponse> {
  const response = await ct16AuthRequest('/api/cloud/connections', {
    ...options,
    method: 'GET',
    cache: 'no-store',
  })
  return response.json() as Promise<CloudConnectionListResponse>
}

export async function getCloudConnection(id: string, options?: RequestInit): Promise<CloudConnection> {
  const response = await ct16AuthRequest(`/api/cloud/connections/${encodeURIComponent(id)}`, {
    ...options,
    method: 'GET',
    cache: 'no-store',
  })
  return response.json() as Promise<CloudConnection>
}

export async function createCloudConnection(mutation: CloudConnectionMutation): Promise<CloudConnection> {
  const response = await ct16AuthRequest('/api/cloud/connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mutation),
  })
  return response.json() as Promise<CloudConnection>
}

export async function updateCloudConnection(id: string, mutation: CloudConnectionMutation): Promise<CloudConnection> {
  const response = await ct16AuthRequest(`/api/cloud/connections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mutation),
  })
  return response.json() as Promise<CloudConnection>
}

export async function setCloudConnectionEnabled(id: string, enabled: boolean): Promise<CloudConnection> {
  const response = await ct16AuthRequest(`/api/cloud/connections/${encodeURIComponent(id)}/enabled`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  })
  return response.json() as Promise<CloudConnection>
}

export async function reconnectCloudConnection(id: string): Promise<CloudConnection> {
  const response = await ct16AuthRequest(`/api/cloud/connections/${encodeURIComponent(id)}/reconnect`, {
    method: 'POST',
  })
  return response.json() as Promise<CloudConnection>
}

export async function deleteCloudConnection(id: string): Promise<void> {
  await ct16AuthRequest(`/api/cloud/connections/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getCloudMqttTraffic(
  connectionId: string,
  query: CloudMqttTrafficQuery = {},
  options?: RequestInit,
): Promise<CloudMqttTrafficResponse> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  const response = await ct16AuthRequest(
    `/api/cloud/connections/${encodeURIComponent(connectionId)}/mqtt-records${suffix}`,
    { ...options, method: 'GET', cache: 'no-store' },
  )
  return response.json() as Promise<CloudMqttTrafficResponse>
}

export async function clearCloudMqttTraffic(connectionId: string): Promise<void> {
  await ct16AuthRequest(`/api/cloud/connections/${encodeURIComponent(connectionId)}/mqtt-records`, {
    method: 'DELETE',
  })
}
