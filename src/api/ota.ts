import { ct16AuthGet, ct16AuthPost, ct16AuthRequest } from './client'
import type { Ct16CreateOtaUploadDto, Ct16OtaUploadDto } from './types'

const OTA_API_PREFIX = '/api/ota'

export function createOtaUpload(data: Ct16CreateOtaUploadDto): Promise<Ct16OtaUploadDto> {
  return ct16AuthPost<Ct16OtaUploadDto>(`${OTA_API_PREFIX}/uploads`, data)
}

export function getOtaUpload(id: string): Promise<Ct16OtaUploadDto> {
  return ct16AuthGet<Ct16OtaUploadDto>(`${OTA_API_PREFIX}/uploads/${id}`)
}

export async function cancelOtaUpload(id: string): Promise<void> {
  await ct16AuthRequest(`${OTA_API_PREFIX}/uploads/${id}`, { method: 'DELETE' })
}

export function getOtaJob(id: string): Promise<Ct16OtaUploadDto> {
  return ct16AuthGet<Ct16OtaUploadDto>(`${OTA_API_PREFIX}/jobs/${id}`)
}

export async function uploadOtaChunk(
  id: string,
  chunk: Blob,
  start: number,
  total: number,
  md5: string,
): Promise<Ct16OtaUploadDto> {
  const end = start + chunk.size - 1
  const response = await ct16AuthRequest(`${OTA_API_PREFIX}/uploads/${id}/content`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'X-Chunk-MD5': md5,
    },
    body: chunk,
  })
  return response.json() as Promise<Ct16OtaUploadDto>
}

export function completeOtaUpload(id: string): Promise<Ct16OtaUploadDto> {
  return ct16AuthPost<Ct16OtaUploadDto>(`${OTA_API_PREFIX}/uploads/${id}/complete`)
}

export function retryOtaUpgrade(id: string): Promise<Ct16OtaUploadDto> {
  return ct16AuthPost<Ct16OtaUploadDto>(`${OTA_API_PREFIX}/jobs/${id}/retry`)
}
