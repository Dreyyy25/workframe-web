/**
 * Jobs services: DTO→view-model adapter fidelity, filter-name resolution,
 * query-param mapping, and null on 404.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import {
  JOB_POST_ID,
  JOB_TYPE_FULLTIME_ID,
  PUBLIC_COMPANY_ID,
  STREAM_ID,
  jobPost,
  paginated,
} from '@/test/msw/fixtures'
import { _resetMetaForTests } from '../meta'
import { adaptJob, getJob, listCompanyRoles, listJobs } from '../jobs'

function captureJobsUrl(hits: URL[]) {
  server.use(
    http.get('*/api/v1/jobs/job-posts/', ({ request }) => {
      hits.push(new URL(request.url))
      return HttpResponse.json(paginated([jobPost()]))
    }),
  )
}

describe('adaptJob', () => {
  it('maps the nested DTO to the screen view model', () => {
    const job = adaptJob(jobPost())
    expect(job).toMatchObject({
      id: JOB_POST_ID,
      companyId: PUBLIC_COMPANY_ID,
      title: 'Machine Learning Engineer',
      type: 'Full-time',
      city: 'Berlin',
      country: 'Germany',
      salaryMin: 90000,
      salaryMax: 120000,
      salaryType: 'yearly',
      deadline: '2026-09-01',
      posted: '2026-08-01',
      published: true,
      company: { id: PUBLIC_COMPANY_ID, name: 'Halcyon Systems' },
    })
    expect(job.skills).toEqual([{ name: 'Python', level: 'Advanced', required: true }])
  })

  it('normalizes null salaries, empty salary_type, and null deadline', () => {
    const job = adaptJob(
      jobPost({ salary_min: null, salary_max: null, salary_type: '', deadline_date: null }),
    )
    expect(job.salaryMin).toBeNull()
    expect(job.salaryMax).toBeNull()
    expect(job.salaryType).toBeNull()
    expect(job.deadline).toBeNull()
  })
})

describe('listJobs', () => {
  beforeEach(() => _resetMetaForTests())

  it('maps filters to API params (newest sort)', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    await listJobs({ search: 'ml', type: 'Full-time', stream: 'Data & AI', minSalary: 100000, page: 2, pageSize: 9, sort: 'newest' })
    const q = hits[0].searchParams
    expect(q.get('search')).toBe('ml')
    expect(q.get('job_type')).toBe(JOB_TYPE_FULLTIME_ID)
    expect(q.get('business_stream')).toBe(STREAM_ID)
    expect(q.get('salary_floor')).toBe('100000')
    expect(q.get('ordering')).toBe('-created_at')
    expect(q.get('page')).toBe('2')
    expect(q.get('page_size')).toBe('9')
  })

  it('uses -salary_rank for the salary sort', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    await listJobs({ sort: 'salary' })
    expect(hits[0].searchParams.get('ordering')).toBe('-salary_rank')
  })

  it('pins public browse to published+active posts (spec B8)', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    await listJobs({})
    expect(hits[0].searchParams.get('is_published')).toBe('true')
    expect(hits[0].searchParams.get('is_active')).toBe('true')
  })

  it('returns an empty page for an unknown type name without calling the API', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    const out = await listJobs({ type: 'Internship' })
    expect(out).toEqual({ results: [], count: 0 })
    expect(hits).toHaveLength(0)
  })

  it('returns an empty page for an unknown stream name without calling the API', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    const out = await listJobs({ stream: 'Bogus' })
    expect(out).toEqual({ results: [], count: 0 })
    expect(hits).toHaveLength(0)
  })

  it('returns adapted results with the backend count', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () =>
        HttpResponse.json({ ...paginated([jobPost()]), count: 42 }),
      ),
    )
    const out = await listJobs({})
    expect(out.count).toBe(42)
    expect(out.results[0].title).toBe('Machine Learning Engineer')
  })
})

describe('getJob / listCompanyRoles', () => {
  it('returns null for a missing job (404) and rethrows other errors', async () => {
    expect(await getJob('00000000-0000-4000-8000-000000000000')).toBeNull()
    server.use(
      http.get('*/api/v1/jobs/job-posts/:id/', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    await expect(getJob(JOB_POST_ID)).rejects.toBeTruthy()
  })

  it("fetches a company's roles by company param", async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    const roles = await listCompanyRoles(PUBLIC_COMPANY_ID)
    expect(hits[0].searchParams.get('company')).toBe(PUBLIC_COMPANY_ID)
    expect(hits[0].searchParams.get('page_size')).toBe('100')
    expect(roles[0].company.name).toBe('Halcyon Systems')
  })

  it('pins the public company-roles view to published+active posts (spec B8)', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    await listCompanyRoles(PUBLIC_COMPANY_ID)
    expect(hits[0].searchParams.get('is_published')).toBe('true')
    expect(hits[0].searchParams.get('is_active')).toBe('true')
  })
})
