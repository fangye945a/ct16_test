import { setSessionToken, getSessionToken, clearSessionToken } from './client'
import type {
  Ct16LoginRequestDto,
  Ct16LoginResponseDto,
  Ct16AuthStatusDto,
  Ct16ChangePasswordRequestDto,
} from './types'

const AUTH_API_PREFIX = '/api/auth'

/**
 * 登录
 */
export async function login(
  username: string,
  password: string,
  rememberMe: boolean,
): Promise<Ct16LoginResponseDto> {
  const body: Ct16LoginRequestDto = { username, password }
  const res = await fetch(`${AUTH_API_PREFIX}/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

  const data: Ct16LoginResponseDto = await res.json()
  setSessionToken(data.token, rememberMe)
  return data
}

/**
 * 获取认证状态
 */
export async function getAuthStatus(): Promise<Ct16AuthStatusDto> {
  const token = getSessionToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${AUTH_API_PREFIX}/status`, {
    method: 'GET',
    headers,
  })

  if (!res.ok) {
    return { isLoggedIn: false, isSetup: false }
  }

  return res.json()
}

/**
 * 修改密码
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const token = getSessionToken()
  if (!token) {
    throw new Error('未登录')
  }

  const body: Ct16ChangePasswordRequestDto = { currentPassword, newPassword }
  const res = await fetch(`${AUTH_API_PREFIX}/change-password`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
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

    // 如果是 401，清除过期 token
    if (res.status === 401) {
      clearSessionToken()
    }

    throw new Error(msg)
  }
}
