/**
 * AuthProvider state machine: bootstrap via silent refresh, login/register/
 * logout transitions, and session-expiry handling. All network via MSW.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import {
  ACCESS_TOKEN,
  COMPANY_PROFILE_ID,
  STREAM_ID,
  companyAuthUser,
  seekerAuthUser,
  seekerProfile,
} from '@/test/msw/fixtures'
import { ApiError, apiGet, clearAccessToken } from '@/lib/api/client'
import { AuthProvider, ProfileSaveError, useAuth } from '../auth-context'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

/** Make the bootstrap resolve logged-out (no refresh cookie server-side). */
function noSession() {
  server.use(
    http.post('*/api/v1/accounts/token/refresh/', () =>
      HttpResponse.json({ detail: 'Refresh token cookie not found.' }, { status: 401 }),
    ),
  )
}

beforeEach(() => clearAccessToken())

describe('bootstrap', () => {
  it('hydrates the user from a valid refresh cookie', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.user).toBeNull()

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toEqual({
      id: seekerAuthUser.id,
      type: 'job_seeker',
      name: 'Ava Reyes',
      email: 'ava@example.com',
    })
    expect(result.current.isSeeker).toBe(true)
    expect(result.current.isCompany).toBe(false)
  })

  it('resolves logged-out when the refresh cookie is absent', async () => {
    noSession()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toBeNull()
  })
})

describe('login', () => {
  it('sets the user and returns the session user', async () => {
    noSession()
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let returned: unknown
    await act(async () => {
      returned = await result.current.login('ava@example.com', 'hunter22hunter22')
    })
    expect(returned).toEqual({
      id: seekerAuthUser.id,
      type: 'job_seeker',
      name: 'Ava Reyes',
      email: 'ava@example.com',
    })
    expect(result.current.user).toEqual(returned)
  })

  it('throws ApiError on bad credentials and leaves the user null', async () => {
    noSession()
    server.use(
      http.post('*/api/v1/accounts/login/', () =>
        HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 }),
      ),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await expect(result.current.login('ava@example.com', 'wrong')).rejects.toBeInstanceOf(
        ApiError,
      )
    })
    expect(result.current.user).toBeNull()
  })
})

describe('register', () => {
  it('registers a seeker then PATCHes the profile names', async () => {
    noSession()
    let patchBody: unknown = null
    let patchedId: string | null = null
    server.use(
      http.patch('*/api/v1/seekers/profiles/:id/', async ({ request, params }) => {
        patchedId = params.id as string
        patchBody = await request.json()
        return HttpResponse.json(seekerProfile({ first_name: 'Ava', last_name: 'Reyes' }))
      }),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.register({
        type: 'job_seeker',
        email: 'ava@example.com',
        password: 'hunter22hunter22',
        firstName: 'Ava',
        lastName: 'Reyes',
      })
    })
    expect(patchedId).toBe(seekerAuthUser.id)
    expect(patchBody).toEqual({ first_name: 'Ava', last_name: 'Reyes' })
    expect(result.current.user?.name).toBe('Ava Reyes')
  })

  it('registers a company then PATCHes name + business stream to the company profile id', async () => {
    noSession()
    let patchBody: unknown = null
    let patchedId: string | null = null
    server.use(
      http.post('*/api/v1/accounts/register/', () =>
        HttpResponse.json(
          {
            message: 'User created successfully',
            user: companyAuthUser,
            tokens: { access: ACCESS_TOKEN },
            profile: {
              id: COMPANY_PROFILE_ID,
              user_account: companyAuthUser.id,
              company_name: '',
              business_stream: STREAM_ID,
              profile_description: '',
              company_website_url: '',
              contact_email: '',
              status: 'active',
              created_at: '2026-08-01T10:00:00Z',
              updated_at: '2026-08-01T10:00:00Z',
            },
          },
          { status: 201 },
        ),
      ),
      http.patch('*/api/v1/companies/profile/:id/', async ({ request, params }) => {
        patchedId = params.id as string
        patchBody = await request.json()
        return HttpResponse.json({})
      }),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.register({
        type: 'company',
        email: 'team@northwind.dev',
        password: 'hunter22hunter22',
        companyName: 'Northwind Labs',
        businessStreamId: STREAM_ID,
      })
    })
    expect(patchedId).toBe(COMPANY_PROFILE_ID)
    expect(patchBody).toEqual({ company_name: 'Northwind Labs', business_stream: STREAM_ID })
    expect(result.current.user?.name).toBe('Northwind Labs')
    expect(result.current.isCompany).toBe(true)
  })

  it('still logs the user in (email name) and throws ProfileSaveError when the PATCH fails', async () => {
    noSession()
    server.use(
      http.patch('*/api/v1/seekers/profiles/:id/', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await expect(
        result.current.register({
          type: 'job_seeker',
          email: 'ava@example.com',
          password: 'hunter22hunter22',
          firstName: 'Ava',
          lastName: 'Reyes',
        }),
      ).rejects.toBeInstanceOf(ProfileSaveError)
    })
    expect(result.current.user).not.toBeNull()
    expect(result.current.user?.name).toBe('ava@example.com')
  })
})

describe('logout', () => {
  it('clears the user and calls the logout endpoint', async () => {
    let logoutCalls = 0
    server.use(
      http.post('*/api/v1/accounts/logout/', () => {
        logoutCalls++
        return new HttpResponse(null, { status: 205 })
      }),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())

    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.user).toBeNull()
    expect(logoutCalls).toBe(1)
  })

  it('clears the user even when the network call fails', async () => {
    server.use(
      http.post('*/api/v1/accounts/logout/', () => HttpResponse.error()),
    )
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())

    await act(async () => {
      await result.current.logout()
    })
    expect(result.current.user).toBeNull()
  })
})

describe('session expiry', () => {
  it('clears the user when an authorized call dies on a failed refresh', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.user).not.toBeNull())

    server.use(
      http.get('*/api/v1/protected/', () =>
        HttpResponse.json({ detail: 'Token expired' }, { status: 401 }),
      ),
      http.post('*/api/v1/accounts/token/refresh/', () =>
        HttpResponse.json({ detail: 'Token is blacklisted' }, { status: 401 }),
      ),
    )
    await act(async () => {
      await apiGet('/protected/').catch(() => undefined)
    })
    await waitFor(() => expect(result.current.user).toBeNull())
  })
})
