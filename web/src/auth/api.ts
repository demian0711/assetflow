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

  readonly fieldErrors?: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, cache: 'no-store' })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message = typeof body?.detail === 'string' ? body.detail : 'The request failed.'
    throw new ApiError(response.status, message, body?.errors)
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

export function authorizedRequest<T>(accessToken: string, path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)
  headers.set('Authorization', 'Bearer ' + accessToken)
  return request<T>(path, { ...options, headers })
}

export function getCurrentUser(accessToken: string, signal: AbortSignal) {
  return authorizedRequest<CurrentUser>(accessToken, '/api/auth/me', { signal })
}
