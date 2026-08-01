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
}

export function clearAccessToken(): void {
  accessToken = null
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
  const { method = 'GET', body, params, auth = true } = opts

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
  if (!res.ok) throw new ApiError(res.status, parsed)
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
