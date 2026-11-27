export type LoginCredentials = { email: string; password: string }
export type Session = { accessToken: string; expiresAtUtc: string }

export type CurrentUser = {
  id: string
  email: string | null
  roles: string[]
  createdAtUtc: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, cache: 'no-store' })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = typeof body?.detail === 'string' ? body.detail : 'The request failed.'
    throw new ApiError(response.status, message)
  }

  return response.json()
}

export function login(credentials: LoginCredentials) {
  return request<Session>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
}

export function getCurrentUser(accessToken: string, signal: AbortSignal) {
  return request<CurrentUser>('/api/auth/me', {
    headers: { Authorization: 'Bearer ' + accessToken },
    signal,
  })
}
