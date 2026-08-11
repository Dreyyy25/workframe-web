/** Applications services: nested adapter, apply contract, withdraw PATCH,
 * applicant identity, and the applicant-detail composite. */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import {
  ACCESS_TOKEN, APPLICATION_ID, EDUCATION_ID, EXPERIENCE_ID,
  JOB_POST_ID, PUBLIC_COMPANY_ID, SEEKER_ID, applicationDto,
} from '@/test/msw/fixtures'
import {
  applyToJob, getApplicantDetail, getApplication, listApplications,
  setApplicantStatus, withdrawApplication,
} from '../applications'

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

  it('carries the applicant identity from the dto', async () => {
    const [a] = await listApplications()
    expect(a.applicant).toEqual({ id: SEEKER_ID, name: 'Avery Quinn' })
  })
})

describe('getApplication', () => {
  it('returns null on 404', async () => {
    expect(await getApplication('00000000-0000-4000-8000-000000000000')).toBeNull()
  })

  it('maps a null dto applicant through to a null view-model applicant', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-applications/:id/', () =>
        HttpResponse.json(applicationDto({ applicant: null })),
      ),
    )
    const app = await getApplication(APPLICATION_ID)
    expect(app?.applicant).toBeNull()
  })
})

describe('getApplicantDetail', () => {
  it('joins application + seeker dashboard into an applicant profile', async () => {
    const detail = await getApplicantDetail(APPLICATION_ID)
    expect(detail).not.toBeNull()
    expect(detail?.userId).toBe(SEEKER_ID)
    expect(detail?.application).toMatchObject({ id: APPLICATION_ID, status: 'pending' })
    expect(detail?.profile).toEqual({
      name: 'Ava Reyes',
      goals: 'Ship ML systems.',
      contactDetails: '+49 111',
      resumeUrl: 'https://cv.example/ava.pdf',
      skills: [{ name: 'Python', level: 'Advanced' }],
      education: [{
        id: EDUCATION_ID, school: 'TU Berlin', degree: 'Master', field: 'Computer Science',
        start: '2019-09', end: '2021-07', percentage: 85,
      }],
      experience: [{
        id: EXPERIENCE_ID, company: 'Vertex Data', position: 'ML Engineer', city: 'Berlin',
        country: 'Germany', start: '2021-08', end: '', description: 'Built pipelines.',
      }],
    })
  })

  it('collapses to a null-profile fallback when the dashboard 404s', async () => {
    server.use(
      http.get('*/api/v1/seekers/dashboard/:id/', () =>
        HttpResponse.json({ error: 'Profile not found' }, { status: 404 }),
      ),
    )
    const expectedApp = await getApplication(APPLICATION_ID)
    const detail = await getApplicantDetail(APPLICATION_ID)
    expect(detail).toEqual({ application: expectedApp, profile: null, userId: SEEKER_ID })
  })

  it('returns null when the application 404s', async () => {
    expect(await getApplicantDetail('00000000-0000-4000-8000-000000000000')).toBeNull()
  })

  it('rejects when the dashboard fetch fails with a non-404 error', async () => {
    server.use(
      http.get('*/api/v1/seekers/dashboard/:id/', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    await expect(getApplicantDetail(APPLICATION_ID)).rejects.toMatchObject({ message: 'boom' })
  })
})

describe('setApplicantStatus', () => {
  it('PATCHes application_status', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.patch('*/api/v1/jobs/job-applications/:id/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: APPLICATION_ID, application_status: 'reviewed' })
      }),
    )
    await setApplicantStatus(APPLICATION_ID, 'reviewed')
    expect(body).toEqual({ application_status: 'reviewed' })
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
