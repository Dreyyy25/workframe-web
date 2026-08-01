import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import {
  companyAuthUser,
  seekerAuthUser,
  seekerProfile,
} from '@/test/msw/fixtures'
import { clearAccessToken } from '@/lib/api/client'
import { buildSessionUser } from '../session'

beforeEach(() => clearAccessToken())

describe('buildSessionUser', () => {
  it('derives a seeker name from the seeker profile', async () => {
    const user = await buildSessionUser(seekerAuthUser)
    expect(user).toEqual({
      id: seekerAuthUser.id,
      type: 'job_seeker',
      name: 'Ava Reyes',
      email: 'ava@example.com',
    })
  })

  it('derives a company name from the company dashboard', async () => {
    const user = await buildSessionUser(companyAuthUser)
    expect(user).toEqual({
      id: companyAuthUser.id,
      type: 'company',
      name: 'Northwind Labs',
      email: 'team@northwind.dev',
    })
  })

  it('falls back to the email when the profile fetch fails', async () => {
    server.use(
      http.get('*/api/v1/seekers/profiles/:id/', () =>
        HttpResponse.json({ detail: 'Not found.' }, { status: 404 }),
      ),
    )
    const user = await buildSessionUser(seekerAuthUser)
    expect(user.name).toBe('ava@example.com')
  })

  it('falls back to the email when the profile names are blank', async () => {
    server.use(
      http.get('*/api/v1/seekers/profiles/:id/', () =>
        HttpResponse.json(seekerProfile({ first_name: '', last_name: '' })),
      ),
    )
    const user = await buildSessionUser(seekerAuthUser)
    expect(user.name).toBe('ava@example.com')
  })
})
