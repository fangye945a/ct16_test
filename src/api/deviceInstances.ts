import { ct16AuthGet, ct16AuthPost } from './client'

export interface Ct16DeviceInstanceDto {
	name: string
  sn: string
  type: string
  vendor: string
  model: string
  index: string
  devPoint: string
  groupName: string
	info: string
	remark: string
}

export interface Ct16DeviceInstanceListDto {
  devices: Ct16DeviceInstanceDto[]
  totalCount: number
}

export interface AddDeviceInstanceRequest {
	name?: string
  sn: string
  type: string
  vendor: string
  model: string
  index: string
  devPoint: string
  groupName: string
	info: string
	remark?: string
}

export interface BatchAddDeviceInstanceResult {
  sn: string
  status: 'success' | 'failed'
  message: string
}

export interface BatchAddDeviceInstanceResponse {
  results: BatchAddDeviceInstanceResult[]
}

export function getDeviceInstances(): Promise<Ct16DeviceInstanceListDto> {
  return ct16AuthGet<Ct16DeviceInstanceListDto>('/api/device-instances')
}

export function addDeviceInstance(request: AddDeviceInstanceRequest): Promise<Ct16DeviceInstanceDto> {
  return ct16AuthPost<Ct16DeviceInstanceDto>('/api/device-instances', request)
}

export function batchAddDeviceInstances(requests: AddDeviceInstanceRequest[]): Promise<BatchAddDeviceInstanceResponse> {
  return ct16AuthPost<BatchAddDeviceInstanceResponse>('/api/device-instances/batch', { devices: requests })
}
