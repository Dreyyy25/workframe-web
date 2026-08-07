/** Applications services: nested adapter, apply contract, withdraw PATCH. */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, APPLICATION_ID, JOB_POST_ID, PUBLIC_COMPANY_ID, SEEKER_ID } from '@/test/msw/fixtures'
import { applyToJob, getApplication, listApplications, withdrawApplication } from '../applications'

beforeEach(() => setAccessToken(ACCESS_TOKEN))

describe('listApplications', () => {
  it('adapts the nested read shape', async () => {
    const [a] = await listApplications()
    expect(a).toMatchObject({
      id: APPLICATION_ID, jobId: JOB_POST_ID, status: 'pending',
      applied: '2026-08-05', cover: 'I love this role.',
    })
    expect(a.job).toEqual({
      id: JOB_POST_ID, title: 'Machine Learning Engineer', type: 'Full-time',
      city: 'Berlin', country: 'Germany', salaryMin: 90000, salaryMax: 120000,
      salaryType: 'yearly', companyId: PUBLIC_COMPANY_ID,
      company: { id: PUBLIC_COMPANY_ID, name: 'Halcyon Systems' }, published: true,
    })
  })
})

describe('getApplication', () => {
  it('returns null on 404', async () => {
    expect(await getApplication('00000000-0000-4000-8000-000000000000')).toBeNull()
  })
})

describe('applyToJob', () => {
  it('posts the apply contract with the session user id', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.post('*/api/v1/jobs/apply/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { message: 'ok', data: { id: APPLICATION_ID, application_status: 'pending', application_date: '2026-08-06T10:00:00Z' } },
          { status: 201 },
        )
      }),
    )
    const app = await applyToJob(JOB_POST_ID, 'Hi!')
    expect(body).toEqual({ user_account: SEEKER_ID, job_post: JOB_POST_ID, cover_letter: 'Hi!' })
    expect(app).toMatchObject({ id: APPLICATION_ID, jobId: JOB_POST_ID, status: 'pending', applied: '2026-08-06', cover: 'Hi!' })
  })

  it('surfaces the API error message', async () => {
    server.use(
      http.post('*/api/v1/jobs/apply/', () =>
        HttpResponse.json({ error: 'You have already applied for this job' }, { status: 400 }),
      ),
    )
    await expect(applyToJob(JOB_POST_ID, 'Hi!')).rejects.toMatchObject({
      message: 'You have already applied for this job',
    })
  })
})

describe('withdrawApplication', () => {
  it('PATCHes application_status to withdrawn', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.patch('*/api/v1/jobs/job-applications/:id/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: APPLICATION_ID, application_status: 'withdrawn' })
      }),
    )
    await withdrawApplication(APPLICATION_ID)
    expect(body).toEqual({ application_status: 'withdrawn' })
  })
})
