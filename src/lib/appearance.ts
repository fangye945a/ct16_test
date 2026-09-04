export const CT16_APPEARANCE_EVENT = 'ct16:appearance-changed'
export const CT16_SYSTEM_NAME_KEY = 'ct16:systemName'
export const CT16_LOGO_TYPE_KEY = 'ct16:logoType'
export const CT16_LOGO_IMAGE_KEY = 'ct16:logoImage'
export const CT16_DEFAULT_SYSTEM_NAME = 'CT16 设备管理平台'
export const CT16_DEFAULT_LOGO_TYPE = 'chip'

export type Ct16LogoType = 'chip' | 'gear' | 'shield' | 'hexagon' | 'custom'

export interface Ct16Appearance {
  systemName: string
  logoType: Ct16LogoType
  logoImage: string
}

const FAVICON_PATHS: Record<Exclude<Ct16LogoType, 'custom'>, string[]> = {
  chip: [
    '<rect x="3" y="3" width="18" height="18" rx="4"/>',
    '<circle cx="12" cy="12" r="3"/>',
    '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  ],
  gear: [
    '<circle cx="12" cy="12" r="3"/>',
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06',
    'a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09',
    'A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83',
    'l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09',
    'A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83',
    'l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09',
    'A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83',
    'l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09',
    'a1.65 1.65 0 0 0-1.51 1z"/>',
  ],
  shield: ['<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'],
  hexagon: [
    '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8',
    'a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
  ],
}

export function getCt16Appearance(): Ct16Appearance {
  const storedLogoType = localStorage.getItem(CT16_LOGO_TYPE_KEY)
  const logoType: Ct16LogoType =
    storedLogoType === 'gear' ||
    storedLogoType === 'shield' ||
    storedLogoType === 'hexagon' ||
    storedLogoType === 'custom'
      ? storedLogoType
      : CT16_DEFAULT_LOGO_TYPE

  return {
    systemName: localStorage.getItem(CT16_SYSTEM_NAME_KEY) || CT16_DEFAULT_SYSTEM_NAME,
    logoType,
    logoImage: localStorage.getItem(CT16_LOGO_IMAGE_KEY) || '',
  }
}

/**
 * 缓存设备端系统外观，并通知页面同步更新。
 */
export function applyCt16Appearance(appearance: Ct16Appearance): void {
  localStorage.setItem(CT16_SYSTEM_NAME_KEY, appearance.systemName)
  localStorage.setItem(CT16_LOGO_TYPE_KEY, appearance.logoType)
  if (appearance.logoType === 'custom' && appearance.logoImage) {
    localStorage.setItem(CT16_LOGO_IMAGE_KEY, appearance.logoImage)
  } else {
    localStorage.removeItem(CT16_LOGO_IMAGE_KEY)
  }
  window.dispatchEvent(new Event(CT16_APPEARANCE_EVENT))
}

/**
 * 根据系统外观生成浏览器标签页图标。
 */
export function getCt16Favicon(appearance: Ct16Appearance): string {
  if (appearance.logoType === 'custom' && appearance.logoImage) {
    return appearance.logoImage
  }

  const logoType = appearance.logoType === 'custom' ? CT16_DEFAULT_LOGO_TYPE : appearance.logoType
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
    '<rect width="24" height="24" rx="5" fill="#00b87a"/>',
    '<g fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
    ...FAVICON_PATHS[logoType],
    '</g></svg>',
  ].join('')
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
