import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import {
  ApiError,
  apiGet,
  apiPost,
  clearAccessToken,
  setAccessToken,
} from '../client'

beforeEach(() => clearAccessToken())

describe('ApiError normalization', () => {
  it('normalizes DRF {detail} bodies', async () => {
    server.use(
      http.get('*/api/v1/thing/', () =>
        HttpResponse.json({ detail: 'Not found.' }, { status: 404 }),
      ),
    )
    const err = await apiGet('/thing/').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    const apiErr = err as ApiError
    expect(apiErr.status).toBe(404)
    expect(apiErr.message).toBe('Not found.')
    expect(apiErr.fieldErrors).toEqual({})
  })

  it('normalizes custom {error} bodies', async () => {
    server.use(
      http.post('*/api/v1/accounts/login/', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 }),
      ),
    )
    const err = (await apiPost('/accounts/login/', { body: {} }).catch(
      (e: unknown) => e,
    )) as ApiError
    expect(err.status).toBe(401)
    expect(err.message).toBe('Invalid credentials')
  })

  it('normalizes field-keyed validation dicts into fieldErrors', async () => {
    server.use(
      http.post('*/api/v1/accounts/register/', () =>
        HttpResponse.json(
          {
            email: ['user account with this email already exists.'],
            password: ['This password is too short.'],
          },
          { status: 400 },
        ),
      ),
    )
    const err = (await apiPost('/accounts/register/', { body: {} }).catch(
      (e: unknown) => e,
    )) as ApiError
    expect(err.status).toBe(400)
    expect(err.fieldErrors).toEqual({
      email: ['user account with this email already exists.'],
      password: ['This password is too short.'],
    })
    expect(err.message).toBe('user account with this email already exists.')
  })

  it('falls back to a generic message for non-JSON bodies', async () => {
    server.use(
      http.get('*/api/v1/thing/', () =>
        new HttpResponse('<html>gateway error</html>', {
          status: 502,
          headers: { 'Content-Type': 'text/html' },
        }),
      ),
    )
    const err = (await apiGet('/thing/').catch((e: unknown) => e)) as ApiError
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(502)
    expect(err.message).toMatch(/502/)
  })
})

describe('request building', () => {
  it('serializes params and skips undefined and empty values', async () => {
    let seenUrl = ''
    server.use(
      http.get('*/api/v1/jobs/job-posts/', ({ request }) => {
        seenUrl = request.url
        return HttpResponse.json({ count: 0, next: null, previous: null, results: [] })
      }),
    )
    await apiGet('/jobs/job-posts/', { page_size: 6, search: '', ordering: undefined })
    const url = new URL(seenUrl)
    expect(url.searchParams.get('page_size')).toBe('6')
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.has('ordering')).toBe(false)
  })

  it('omits the Authorization header when no token is set', async () => {
    let authHeader: string | null = 'sentinel'
    server.use(
      http.get('*/api/v1/thing/', ({ request }) => {
        authHeader = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await apiGet('/thing/')
    expect(authHeader).toBeNull()
  })

  it('sends Authorization: Bearer when a token is set', async () => {
    let authHeader: string | null = null
    server.use(
      http.get('*/api/v1/thing/', ({ request }) => {
        authHeader = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    setAccessToken('my-token')
    await apiGet('/thing/')
    expect(authHeader).toBe('Bearer my-token')
  })

  it('sends a JSON body with Content-Type on POST', async () => {
    let contentType: string | null = null
    let body: unknown = null
    server.use(
      http.post('*/api/v1/accounts/login/', async ({ request }) => {
        contentType = request.headers.get('content-type')
        body = await request.json()
        return HttpResponse.json({ ok: true })
      }),
    )
    await apiPost('/accounts/login/', { body: { email: 'a@b.co', password: 'x' } })
    expect(contentType).toContain('application/json')
    expect(body).toEqual({ email: 'a@b.co', password: 'x' })
  })

  it('resolves empty 205 responses without a JSON parse error', async () => {
    server.use(
      http.post('*/api/v1/accounts/logout/', () => new HttpResponse(null, { status: 205 })),
    )
    await expect(apiPost('/accounts/logout/')).resolves.toBeUndefined()
  })
})
