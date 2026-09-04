import { ct16AuthRequest, ct16Get } from './client'

export type Ct16LogoType = 'chip' | 'gear' | 'shield' | 'hexagon' | 'custom'

export interface Ct16AppearanceDto {
  systemName: string
  logoType: Ct16LogoType
  logoImage: string
}

export function getSystemAppearance(): Promise<Ct16AppearanceDto> {
  return ct16Get<Ct16AppearanceDto>('/api/system/appearance')
}

export async function updateSystemAppearance(
  data: Pick<Ct16AppearanceDto, 'systemName' | 'logoType'>,
): Promise<Ct16AppearanceDto> {
  const response = await ct16AuthRequest('/api/settings/appearance', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return response.json() as Promise<Ct16AppearanceDto>
}

export async function uploadSystemLogo(file: File): Promise<Ct16AppearanceDto> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await ct16AuthRequest('/api/settings/appearance/logo', {
    method: 'POST',
    body: formData,
  })
  return response.json() as Promise<Ct16AppearanceDto>
}
