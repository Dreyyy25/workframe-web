const BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000/api/v1'

export const API_BASE = BASE

type Params = Record<string, string | number | boolean | undefined>

/** Minimal typed GET for public endpoints. Auth/refresh can layer on here later. */
export async function apiGet<T>(path: string, params?: Params): Promise<T> {
  const url = new URL(BASE + path)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
  }
  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`API ${res.status} on ${path}`)
  return (await res.json()) as T
}
