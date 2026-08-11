/** New Slice-3 endpoints respond with staging-shaped bodies and are auth-gated. */
import { beforeEach, describe, expect, it } from 'vitest'
import { setAccessToken, clearAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, APPLICATION_ID, SEEKER_ID } from '../fixtures'
import { getApplications } from '@/lib/api/applications'
import { getSeekerDashboard } from '@/lib/api/seekers'

describe('slice-3 MSW harness', () => {
  beforeEach(() => setAccessToken(ACCESS_TOKEN))

  it('serves the dashboard composite', async () => {
    const d = await getSeekerDashboard(SEEKER_ID)
    expect(d.profile.first_name).toBe('Ava')
    expect(d.skills[0].skill_set.skill_name).toBe('Python')
  })

  it('serves nested applications and rejects tokenless calls', async () => {
    const page = await getApplications()
    expect(page.results[0].id).toBe(APPLICATION_ID)
    expect(page.results[0].job_post.company.company_name).toBe('Halcyon Systems')
    clearAccessToken()
    await expect(getApplications()).rejects.toMatchObject({ status: 401 })
  })
})
