/**
 * HTTP client for the Django Job Board API.
 *
 * Token model: the access token lives only in this module's memory (never
 * persisted); the refresh token is an httpOnly cookie the browser attaches
 * automatically — every request goes out with credentials: 'include' so the
 * auth endpoints receive it.
 */

const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000/api/v1'

export const API_BASE = BASE

type Params = Record<string, string | number | boolean | undefined>

// --- in-memory access token ------------------------------------------------

let accessToken: string | null = null

export function setAccessToken(token: string): void {
  accessToken = token
  sessionExpiredNotified = false
}

export function clearAccessToken(): void {
  accessToken = null
}

// --- session-expiry notification -------------------------------------------

/**
 * Registered by AuthProvider at mount. Fired (once per session) only when an
 * authorized request 401s AND the follow-up refresh fails — i.e. a session
 * that existed has died. Direct refreshAccessToken() failures (bootstrap of
 * a logged-out visitor) do NOT fire it.
 */
let onSessionExpired: (() => void) | null = null
let sessionExpiredNotified = false

export function setOnSessionExpired(cb: (() => void) | null): void {
  onSessionExpired = cb
  sessionExpiredNotified = false
}

function notifySessionExpired(): void {
  if (sessionExpiredNotified) return
  sessionExpiredNotified = true
  onSessionExpired?.()
}

// --- error normalization ---------------------------------------------------

/**
 * Normalizes the backend's three error shapes:
 *   1. DRF: {detail: "..."} (optionally with code/messages for JWT errors)
 *   2. Custom function views: {error: "..."}
 *   3. Serializer validation: {email: ["..."], password: ["..."]}
 */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  readonly fieldErrors: Record<string, string[]>

  constructor(status: number, body: unknown) {
    const { message, fieldErrors } = ApiError.normalize(status, body)
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.fieldErrors = fieldErrors
  }

  private static normalize(
    status: number,
    body: unknown,
  ): { message: string; fieldErrors: Record<string, string[]> } {
    const fallback = `Request failed with status ${status}`
    if (typeof body !== 'object' || body === null) {
      return { message: fallback, fieldErrors: {} }
    }
    const record = body as Record<string, unknown>
    if (typeof record.detail === 'string') {
      return { message: record.detail, fieldErrors: {} }
    }
    if (typeof record.error === 'string') {
      return { message: record.error, fieldErrors: {} }
    }
    const fieldErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        fieldErrors[key] = [value]
      } else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
        fieldErrors[key] = value
      }
    }
    const firstField = Object.values(fieldErrors)[0]
    return {
      message: firstField?.[0] ?? fallback,
      fieldErrors,
    }
  }
}

// --- core fetch ------------------------------------------------------------

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  params?: Params
  /** Attach the in-memory access token (default true when one is set). */
  auth?: boolean
  /** Internal: marks the one-shot retry after a silent refresh. */
  _isRetry?: boolean
}

// --- single-flight refresh -------------------------------------------------

const REFRESH_PATH = '/accounts/token/refresh/'

let refreshPromise: Promise<string> | null = null

/**
 * POST /accounts/token/refresh/ exactly once no matter how many callers ask
 * concurrently (the backend rotates + blacklists refresh tokens, so parallel
 * refreshes would kill each other). Stores the new access token on success.
 * Also used directly by the AuthProvider bootstrap.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const data = await apiFetch<{ access: string }>(REFRESH_PATH, {
          method: 'POST',
          auth: false,
        })
        setAccessToken(data.access)
        return data.access
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

function buildUrl(path: string, params?: Params): string {
  // BASE may be relative ('/api/v1' behind the dev proxy) or absolute; a
  // relative base resolves against the page origin.
  const url = new URL(BASE + path, window.location.origin)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204 || res.status === 205) return undefined
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const { method = 'GET', body, params, auth = true, _isRetry = false } = opts

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const parsed = await parseBody(res)
  if (!res.ok) {
    const error = new ApiError(res.status, parsed)
    const refreshable =
      res.status === 401 && auth && !_isRetry && path !== REFRESH_PATH
    if (refreshable) {
      try {
        await refreshAccessToken()
      } catch {
        clearAccessToken()
        notifySessionExpired()
        throw error
      }
      return apiFetch<T>(path, { ...opts, _isRetry: true })
    }
    throw error
  }
  return parsed as T
}

// --- verb helpers ----------------------------------------------------------

/** Keeps the original positional-params signature used by public.ts. */
export function apiGet<T>(path: string, params?: Params, opts?: Omit<ApiFetchOptions, 'method' | 'params'>): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: 'GET', params })
}

export function apiPost<T = void>(path: string, opts?: Omit<ApiFetchOptions, 'method'>): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: 'POST' })
}

export function apiPatch<T>(path: string, opts?: Omit<ApiFetchOptions, 'method'>): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: 'PATCH' })
}

export function apiPut<T>(path: string, opts?: Omit<ApiFetchOptions, 'method'>): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: 'PUT' })
}

export function apiDelete<T = void>(path: string, opts?: Omit<ApiFetchOptions, 'method'>): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: 'DELETE' })
}
