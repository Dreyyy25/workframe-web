import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { ACCESS_TOKEN, seekerAuthUser } from '@/test/msw/fixtures'
import { ApiError, clearAccessToken, setAccessToken } from '../client'
import { getMe, login, logout, register } from '../auth'

beforeEach(() => clearAccessToken())

describe('auth api', () => {
  it('login returns the parsed response', async () => {
    const res = await login('ava@example.com', 'hunter22hunter22')
    expect(res.user).toEqual(seekerAuthUser)
    expect(res.tokens.access).toBe(ACCESS_TOKEN)
  })

  it('a 401 from login does not trigger a token refresh', async () => {
    let refreshCalls = 0
    server.use(
      http.post('*/api/v1/accounts/login/', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 }),
      ),
      http.post('*/api/v1/accounts/token/refresh/', () => {
        refreshCalls++
        return HttpResponse.json({ access: 'x' })
      }),
    )
    const err = (await login('ava@example.com', 'wrong').catch((e: unknown) => e)) as ApiError
    expect(err.status).toBe(401)
    expect(refreshCalls).toBe(0)
  })

  it('register posts email, password and user_type', async () => {
    let body: unknown = null
    server.use(
      http.post('*/api/v1/accounts/register/', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(
          {
            message: 'User created successfully',
            user: seekerAuthUser,
            tokens: { access: ACCESS_TOKEN },
            profile: null,
          },
          { status: 201 },
        )
      }),
    )
    await register({ email: 'ava@example.com', password: 'hunter22hunter22', user_type: 'job_seeker' })
    expect(body).toEqual({
      email: 'ava@example.com',
      password: 'hunter22hunter22',
      user_type: 'job_seeker',
    })
  })

  it('logout resolves on an empty 205', async () => {
    setAccessToken(ACCESS_TOKEN)
    await expect(logout()).resolves.toBeUndefined()
  })

  it('getMe returns the account payload', async () => {
    setAccessToken(ACCESS_TOKEN)
    const me = await getMe()
    expect(me.id).toBe(seekerAuthUser.id)
    expect(me.user_type).toBe('job_seeker')
  })
})
