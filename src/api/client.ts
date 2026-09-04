export const CT16_API_BASE = import.meta.env.VITE_CT16_API_BASE?.trim() || ''

const SESSION_KEY = 'ct16:session'

export function getSessionToken(): string | null {
  return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY)
}

export function setSessionToken(token: string, rememberMe: boolean): void {
  if (rememberMe) {
    localStorage.setItem(SESSION_KEY, token)
    sessionStorage.removeItem(SESSION_KEY)
    return
  }
  sessionStorage.setItem(SESSION_KEY, token)
  localStorage.removeItem(SESSION_KEY)
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_KEY)
  sessionStorage.removeItem(SESSION_KEY)
}

async function ct16Fetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${CT16_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `CT16 Backend request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

async function ct16FetchWithAuth<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getSessionToken()
  const authHeaders: Record<string, string> = {}
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${CT16_API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `CT16 Backend request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}

export async function ct16AuthRequest(path: string, options?: RequestInit): Promise<Response> {
  const token = getSessionToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${CT16_API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const text = await response.text()
    try {
      const payload = JSON.parse(text) as { error?: string }
      throw new Error(payload.error || text || `CT16 Backend request failed: ${response.status}`)
    } catch (error) {
      if (error instanceof Error && error.message !== text) throw error
      throw new Error(text || `CT16 Backend request failed: ${response.status}`)
    }
  }

  return response
}

export function ct16Get<T>(path: string, options?: RequestInit): Promise<T> {
  return ct16Fetch<T>(path, { ...options, method: 'GET' })
}

export function ct16Post<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
  return ct16Fetch<T>(path, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export function ct16Put<T>(path: string, body?: unknown, options?: RequestInit): Promise<T> {
  return ct16Fetch<T>(path, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export function ct16AuthGet<T>(path: string): Promise<T> {
  return ct16FetchWithAuth<T>(path, { method: 'GET' })
}

export function ct16AuthDelete<T>(path: string): Promise<T> {
  return ct16FetchWithAuth<T>(path, { method: 'DELETE' })
}

export function ct16AuthPost<T>(path: string, body?: unknown): Promise<T> {
  return ct16FetchWithAuth<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export function ct16AuthPut<T>(path: string, body?: unknown): Promise<T> {
  return ct16FetchWithAuth<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  })
}
