/**
 * Single-flight silent refresh: a 401 on an authorized call triggers exactly
 * one POST /accounts/token/refresh/, then a one-shot retry of the original
 * request with the new access token. Refresh failure notifies the registered
 * onSessionExpired callback exactly once and clears the token.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { delay, http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { ROTATED_ACCESS_TOKEN } from '@/test/msw/fixtures'
import {
  ApiError,
  apiGet,
  apiPost,
  clearAccessToken,
  refreshAccessToken,
  setAccessToken,
  setOnSessionExpired,
} from '../client'

beforeEach(() => {
  clearAccessToken()
  setOnSessionExpired(null)
})
afterEach(() => setOnSessionExpired(null))

/** Protected resource that 401s until it sees the rotated access token. */
function protectedResource(counters: { resource: number; refresh: number }) {
  server.use(
    http.get('*/api/v1/protected/', ({ request }) => {
      counters.resource++
      if (request.headers.get('authorization') === `Bearer ${ROTATED_ACCESS_TOKEN}`) {
        return HttpResponse.json({ ok: true })
      }
      return HttpResponse.json({ detail: 'Token expired' }, { status: 401 })
    }),
    http.post('*/api/v1/accounts/token/refresh/', () => {
      counters.refresh++
      return HttpResponse.json({ access: ROTATED_ACCESS_TOKEN })
    }),
  )
}

describe('silent refresh', () => {
  it('refreshes once and retries the original request on 401', async () => {
    const counters = { resource: 0, refresh: 0 }
    protectedResource(counters)
    setAccessToken('stale-token')

    await expect(apiGet('/protected/')).resolves.toEqual({ ok: true })
    expect(counters.refresh).toBe(1)
    expect(counters.resource).toBe(2)
  })

  it('shares one refresh across concurrent 401s', async () => {
    const counters = { resource: 0, refresh: 0 }
    protectedResource(counters)
    setAccessToken('stale-token')

    const [a, b, c] = await Promise.all([
      apiGet('/protected/'),
      apiGet('/protected/'),
      apiGet('/protected/'),
    ])
    expect(a).toEqual({ ok: true })
    expect(b).toEqual({ ok: true })
    expect(c).toEqual({ ok: true })
    expect(counters.refresh).toBe(1)
  })

  it('retries only once when the retry also 401s', async () => {
    const counters = { resource: 0, refresh: 0 }
    server.use(
      http.get('*/api/v1/protected/', () => {
        counters.resource++
        return HttpResponse.json({ detail: 'still no' }, { status: 401 })
      }),
      http.post('*/api/v1/accounts/token/refresh/', () => {
        counters.refresh++
        return HttpResponse.json({ access: ROTATED_ACCESS_TOKEN })
      }),
    )
    setAccessToken('stale-token')

    const err = (await apiGet('/protected/').catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(401)
    expect(counters.resource).toBe(2)
    expect(counters.refresh).toBe(1)
  })

  it('fires onSessionExpired once and clears the token when refresh fails', async () => {
    const expired = vi.fn()
    setOnSessionExpired(expired)
    let sawAuthHeader: string | null = 'sentinel'
    server.use(
      http.get('*/api/v1/protected/', ({ request }) => {
        sawAuthHeader = request.headers.get('authorization')
        return HttpResponse.json({ detail: 'Token expired' }, { status: 401 })
      }),
      http.post('*/api/v1/accounts/token/refresh/', () =>
        HttpResponse.json({ detail: 'Refresh token cookie not found.' }, { status: 401 }),
      ),
    )
    setAccessToken('stale-token')

    const results = await Promise.allSettled([apiGet('/protected/'), apiGet('/protected/')])
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect(expired).toHaveBeenCalledTimes(1)

    // token was cleared: a follow-up request goes out with no auth header
    sawAuthHeader = 'sentinel'
    server.use(
      http.get('*/api/v1/protected/', ({ request }) => {
        sawAuthHeader = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await apiGet('/protected/')
    expect(sawAuthHeader).toBeNull()
  })

  it('does not attempt a refresh for unauthenticated (auth: false) calls', async () => {
    let refreshCalls = 0
    server.use(
      http.post('*/api/v1/accounts/login/', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 }),
      ),
      http.post('*/api/v1/accounts/token/refresh/', () => {
        refreshCalls++
        return HttpResponse.json({ access: ROTATED_ACCESS_TOKEN })
      }),
    )
    const err = (await apiPost('/accounts/login/', {
      body: { email: 'a@b.co', password: 'nope' },
      auth: false,
    }).catch((e: unknown) => e)) as ApiError
    expect(err.status).toBe(401)
    expect(refreshCalls).toBe(0)
  })

  it('a direct refreshAccessToken() failure does NOT fire onSessionExpired (bootstrap path)', async () => {
    const expired = vi.fn()
    setOnSessionExpired(expired)
    server.use(
      http.post('*/api/v1/accounts/token/refresh/', () =>
        HttpResponse.json({ detail: 'Refresh token cookie not found.' }, { status: 401 }),
      ),
    )
    await expect(refreshAccessToken()).rejects.toBeInstanceOf(ApiError)
    expect(expired).not.toHaveBeenCalled()
  })

  it('does not refresh on 401 when the request carried no token and no refresh is in flight', async () => {
    let refreshCalls = 0
    server.use(
      http.get('*/api/v1/protected/', () =>
        HttpResponse.json({ detail: 'Authentication credentials were not provided.' }, { status: 401 }),
      ),
      http.post('*/api/v1/accounts/token/refresh/', () => {
        refreshCalls++
        return HttpResponse.json({ access: ROTATED_ACCESS_TOKEN })
      }),
    )
    const err = (await apiGet('/protected/').catch((e: unknown) => e)) as ApiError
    expect(err.status).toBe(401)
    expect(refreshCalls).toBe(0)
  })

  it('a tokenless 401 joins a refresh already in flight instead of failing', async () => {
    const counters = { resource: 0, refresh: 0 }
    server.use(
      http.get('*/api/v1/protected/', ({ request }) => {
        counters.resource++
        if (request.headers.get('authorization') === `Bearer ${ROTATED_ACCESS_TOKEN}`) {
          return HttpResponse.json({ ok: true })
        }
        return HttpResponse.json({ detail: 'no token' }, { status: 401 })
      }),
      http.post('*/api/v1/accounts/token/refresh/', async () => {
        counters.refresh++
        await delay(80)
        return HttpResponse.json({ access: ROTATED_ACCESS_TOKEN })
      }),
    )
    // Bootstrap-style direct refresh is in flight; a data query races it.
    const bootstrap = refreshAccessToken()
    const resource = apiGet('/protected/')
    await expect(bootstrap).resolves.toBe(ROTATED_ACCESS_TOKEN)
    await expect(resource).resolves.toEqual({ ok: true })
    expect(counters.refresh).toBe(1)
  })

  it('a throttled (429) refresh keeps the session: no expiry callback, token intact', async () => {
    const expired = vi.fn()
    setOnSessionExpired(expired)
    let authHeader: string | null = null
    server.use(
      http.get('*/api/v1/protected/', ({ request }) => {
        authHeader = request.headers.get('authorization')
        return HttpResponse.json({ detail: 'Token expired' }, { status: 401 })
      }),
      http.post('*/api/v1/accounts/token/refresh/', () =>
        HttpResponse.json({ detail: 'Request was throttled.' }, { status: 429 }),
      ),
    )
    setAccessToken('stale-token')

    const err = (await apiGet('/protected/').catch((e: unknown) => e)) as ApiError
    expect(err.status).toBe(401)
    expect(expired).not.toHaveBeenCalled()

    // token survives so the next attempt (post-throttle) can retry normally
    await apiGet('/protected/').catch(() => undefined)
    expect(authHeader).toBe('Bearer stale-token')
  })

  it('fires onSessionExpired again after a new login re-arms it', async () => {
    const expired = vi.fn()
    setOnSessionExpired(expired)
    const dead = () => [
      http.get('*/api/v1/protected/', () =>
        HttpResponse.json({ detail: 'Token expired' }, { status: 401 }),
      ),
      http.post('*/api/v1/accounts/token/refresh/', () =>
        HttpResponse.json({ detail: 'Token is blacklisted' }, { status: 401 }),
      ),
    ]
    server.use(...dead())
    setAccessToken('first-session')
    await apiGet('/protected/').catch(() => undefined)
    expect(expired).toHaveBeenCalledTimes(1)

    // NOTE: no setOnSessionExpired here — logging in must re-arm by itself.
    setAccessToken('second-session')
    server.use(...dead())
    await apiGet('/protected/').catch(() => undefined)
    expect(expired).toHaveBeenCalledTimes(2)
  })

  it('preserves query params on the post-refresh retry', async () => {
    let retryUrl = ''
    server.use(
      http.get('*/api/v1/protected/', ({ request }) => {
        if (request.headers.get('authorization') === `Bearer ${ROTATED_ACCESS_TOKEN}`) {
          retryUrl = request.url
          return HttpResponse.json({ ok: true })
        }
        return HttpResponse.json({ detail: 'Token expired' }, { status: 401 })
      }),
      http.post('*/api/v1/accounts/token/refresh/', () =>
        HttpResponse.json({ access: ROTATED_ACCESS_TOKEN }),
      ),
    )
    setAccessToken('stale-token')
    await apiGet('/protected/', { page: 2, is_published: false })
    const url = new URL(retryUrl)
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('is_published')).toBe('false')
  })

  it('refreshAccessToken() stores the new token for subsequent requests', async () => {
    let authHeader: string | null = null
    server.use(
      http.get('*/api/v1/protected/', ({ request }) => {
        authHeader = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await refreshAccessToken()
    await apiGet('/protected/')
    expect(authHeader).toBe(`Bearer ${ROTATED_ACCESS_TOKEN}`)
  })
})
