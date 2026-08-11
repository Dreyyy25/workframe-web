/**
 * Company jobs services: list/detail adapters, saveJob create/edit composite
 * (id-keyed skill diffing, wire-asymmetry on salary_type/deadline_date,
 * partial-failure JobSaveError), publish toggle, delete.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { ApiError, setAccessToken } from '@/lib/api/client'
import {
  ACCESS_TOKEN,
  COMPANY_PROFILE_ID,
  JOB_POST_ID,
  JOB_TYPE_FULLTIME_ID,
  SKILL_ID,
  jobLocationDto,
  jobPost,
  jobSkillDto,
  paginated,
} from '@/test/msw/fixtures'
import {
  JobSaveError, deleteJob, getCompanyJob, listCompanyJobs, saveJob, setJobPublished,
} from '../company'
import type { CompanyJobDetail, CompanyJobInput } from '../types'

beforeEach(() => setAccessToken(ACCESS_TOKEN))

// 1. listCompanyJobs -----------------------------------------------------

describe('listCompanyJobs', () => {
  it('passes company + page_size=100 params; adapts JobPost dto', async () => {
    let capturedUrl = ''
    server.use(
      http.get('*/api/v1/jobs/job-posts/', ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(
          paginated([
            jobPost(),
            jobPost({ id: 'job-2', salary_type: '', salary_min: null, salary_max: null }),
          ]),
        )
      }),
    )
    const rows = await listCompanyJobs(COMPANY_PROFILE_ID)
    const url = new URL(capturedUrl)
    expect(url.searchParams.get('company')).toBe(COMPANY_PROFILE_ID)
    expect(url.searchParams.get('page_size')).toBe('100')
    expect(rows[0]).toEqual({
      id: JOB_POST_ID,
      title: 'Machine Learning Engineer',
      type: 'Full-time',
      typeId: JOB_TYPE_FULLTIME_ID,
      city: 'Berlin',
      country: 'Germany',
      salaryMin: 90000,
      salaryMax: 120000,
      salaryType: 'yearly',
      deadline: '2026-09-01',
      published: true,
      active: true,
      posted: '2026-08-01',
    })
    expect(rows[1].salaryType).toBeNull()
    expect(rows[1].salaryMin).toBeNull()
    expect(rows[1].salaryMax).toBeNull()
  })
})

// 2. getCompanyJob --------------------------------------------------------

describe('getCompanyJob', () => {
  it('maps required_skills to skillRows; 404 -> null', async () => {
    const detail = await getCompanyJob(JOB_POST_ID)
    expect(detail).toEqual({
      id: JOB_POST_ID,
      title: 'Machine Learning Engineer',
      type: 'Full-time',
      typeId: JOB_TYPE_FULLTIME_ID,
      city: 'Berlin',
      country: 'Germany',
      salaryMin: 90000,
      salaryMax: 120000,
      salaryType: 'yearly',
      deadline: '2026-09-01',
      published: true,
      active: true,
      posted: '2026-08-01',
      description: 'Build models.',
      skillRows: [{ id: SKILL_ID, name: 'Python', level: 'Advanced', required: true }],
    })

    const missing = await getCompanyJob('does-not-exist')
    expect(missing).toBeNull()
  })
})

// 3-4, 7. saveJob CREATE ---------------------------------------------------

describe('saveJob — CREATE', () => {
  it('posts location, then job post with wire asymmetry, then one skill POST per skill, in order', async () => {
    const events: string[] = []
    let locationBody: unknown
    let postBody: unknown
    const skillBodies: unknown[] = []
    const NEW_LOCATION_ID = 'new-loc-id'
    const NEW_JOB_ID = 'new-job-id'
    server.use(
      http.post('*/api/v1/jobs/job-locations/', async ({ request }) => {
        events.push('location')
        locationBody = await request.json()
        return HttpResponse.json(jobLocationDto({ id: NEW_LOCATION_ID }), { status: 201 })
      }),
      http.post('*/api/v1/jobs/job-posts/', async ({ request }) => {
        events.push('post')
        postBody = await request.json()
        return HttpResponse.json(jobPost({ id: NEW_JOB_ID }), { status: 201 })
      }),
      http.post('*/api/v1/jobs/job-skills/', async ({ request }) => {
        events.push('skill')
        skillBodies.push(await request.json())
        return HttpResponse.json(jobSkillDto(), { status: 201 })
      }),
    )
    const input: CompanyJobInput = {
      title: 'Backend Engineer',
      description: 'Ship APIs.',
      typeId: JOB_TYPE_FULLTIME_ID,
      city: 'Lisbon',
      country: 'Portugal',
      salaryMin: 60000,
      salaryMax: 90000,
      salaryType: null,
      deadline: null,
      published: false,
      skills: [
        { id: null, name: 'Go', level: 'Advanced', required: true },
        { id: null, name: 'SQL', level: 'Intermediate', required: false },
      ],
    }

    const id = await saveJob(input)

    expect(id).toBe(NEW_JOB_ID)
    expect(events).toEqual(['location', 'post', 'skill', 'skill'])
    expect(locationBody).toEqual({ city: 'Lisbon', country: 'Portugal' })
    expect(postBody).toEqual({
      job_title: 'Backend Engineer',
      job_description: 'Ship APIs.',
      job_type: JOB_TYPE_FULLTIME_ID,
      salary_min: 60000,
      salary_max: 90000,
      salary_type: '', // WIRE ASYMMETRY: null salaryType -> '' on the wire
      deadline_date: null,
      is_published: false,
      job_location: NEW_LOCATION_ID,
    })
    expect(skillBodies).toEqual([
      { job_post: NEW_JOB_ID, skill_name: 'Go', skill_level: 'Advanced', is_required: true },
      { job_post: NEW_JOB_ID, skill_name: 'SQL', skill_level: 'Intermediate', is_required: false },
    ])
  })

  it('partial failure: job-post 201, first skill POST 500 -> rejects with JobSaveError carrying the new job id', async () => {
    const NEW_JOB_ID = 'new-job-id-2'
    server.use(
      http.post('*/api/v1/jobs/job-locations/', () =>
        HttpResponse.json(jobLocationDto(), { status: 201 }),
      ),
      http.post('*/api/v1/jobs/job-posts/', () =>
        HttpResponse.json(jobPost({ id: NEW_JOB_ID }), { status: 201 }),
      ),
      http.post('*/api/v1/jobs/job-skills/', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    const input: CompanyJobInput = {
      title: 'Data Analyst',
      description: 'Crunch numbers.',
      typeId: JOB_TYPE_FULLTIME_ID,
      city: 'Lisbon',
      country: 'Portugal',
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      deadline: null,
      published: false,
      skills: [{ id: null, name: 'Excel', level: 'Beginner', required: true }],
    }

    let error: unknown
    try {
      await saveJob(input)
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(JobSaveError)
    expect((error as JobSaveError).jobId).toBe(NEW_JOB_ID)
  })

  it('location 400 propagates as plain ApiError, not JobSaveError (no job exists yet)', async () => {
    server.use(
      http.post('*/api/v1/jobs/job-locations/', () =>
        HttpResponse.json({ city: ['This field is required.'] }, { status: 400 }),
      ),
    )
    const input: CompanyJobInput = {
      title: 'X',
      description: 'Y',
      typeId: JOB_TYPE_FULLTIME_ID,
      city: '',
      country: 'Germany',
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      deadline: null,
      published: false,
      skills: [],
    }

    let error: unknown
    try {
      await saveJob(input)
    } catch (err) {
      error = err
    }
    expect(error).toBeInstanceOf(ApiError)
    expect(error).not.toBeInstanceOf(JobSaveError)
    expect((error as ApiError).status).toBe(400)
    expect((error as ApiError).fieldErrors).toEqual({ city: ['This field is required.'] })
  })
})

// 5-6. saveJob EDIT ---------------------------------------------------------

describe('saveJob — EDIT', () => {
  const baseExisting: CompanyJobDetail = {
    id: 'job-edit-1',
    title: 'Old Title',
    type: 'Full-time',
    typeId: JOB_TYPE_FULLTIME_ID,
    city: 'Berlin',
    country: 'Germany',
    salaryMin: 90000,
    salaryMax: 120000,
    salaryType: 'yearly',
    deadline: '2026-09-01',
    published: true,
    active: true,
    posted: '2026-08-01',
    description: 'Build models.',
    skillRows: [
      { id: 'sk-1', name: 'A', level: 'Intermediate', required: true },
      { id: 'sk-2', name: 'B', level: 'Beginner', required: false },
    ],
  }

  it('diffs skills by row id: PATCH changed, DELETE dropped, POST added; patches only changed job-post fields; no location POST when city/country unchanged', async () => {
    const events: string[] = []
    let patchPostBody: unknown
    let patchSkillBody: unknown
    let deletedSkillId = ''
    let postSkillBody: unknown
    let locationPosted = false
    server.use(
      http.post('*/api/v1/jobs/job-locations/', () => {
        locationPosted = true
        return HttpResponse.json(jobLocationDto(), { status: 201 })
      }),
      http.patch('*/api/v1/jobs/job-posts/:id/', async ({ request }) => {
        events.push('patch-post')
        patchPostBody = await request.json()
        return HttpResponse.json(jobPost())
      }),
      http.patch('*/api/v1/jobs/job-skills/:id/', async ({ request, params }) => {
        events.push(`patch-skill-${params.id}`)
        patchSkillBody = await request.json()
        return HttpResponse.json(jobSkillDto())
      }),
      http.delete('*/api/v1/jobs/job-skills/:id/', ({ params }) => {
        events.push(`delete-skill-${params.id}`)
        deletedSkillId = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
      http.post('*/api/v1/jobs/job-skills/', async ({ request }) => {
        events.push('post-skill')
        postSkillBody = await request.json()
        return HttpResponse.json(jobSkillDto(), { status: 201 })
      }),
    )

    const input: CompanyJobInput = {
      title: 'New Title', // changed
      description: baseExisting.description,
      typeId: baseExisting.typeId,
      city: baseExisting.city,
      country: baseExisting.country,
      salaryMin: baseExisting.salaryMin,
      salaryMax: baseExisting.salaryMax,
      salaryType: baseExisting.salaryType,
      deadline: baseExisting.deadline,
      published: baseExisting.published,
      skills: [
        { id: 'sk-1', name: 'A', level: 'Expert', required: true }, // level changed
        // sk-2 dropped
        { id: null, name: 'C', level: 'Advanced', required: true }, // added
      ],
    }

    const id = await saveJob(input, baseExisting)

    expect(id).toBe(baseExisting.id)
    expect(locationPosted).toBe(false)
    expect(patchPostBody).toEqual({ job_title: 'New Title' })
    expect(events).toEqual(['patch-post', 'delete-skill-sk-2', 'patch-skill-sk-1', 'post-skill'])
    expect(patchSkillBody).toEqual({ skill_level: 'Expert', is_required: true })
    expect(deletedSkillId).toBe('sk-2')
    expect(postSkillBody).toEqual({
      job_post: baseExisting.id, skill_name: 'C', skill_level: 'Advanced', is_required: true,
    })
  })

  it('changed city posts a new location and includes job_location in the PATCH body', async () => {
    let locationBody: unknown
    let patchBody: unknown
    const NEW_LOCATION_ID = 'new-loc-2'
    server.use(
      http.post('*/api/v1/jobs/job-locations/', async ({ request }) => {
        locationBody = await request.json()
        return HttpResponse.json(jobLocationDto({ id: NEW_LOCATION_ID }), { status: 201 })
      }),
      http.patch('*/api/v1/jobs/job-posts/:id/', async ({ request }) => {
        patchBody = await request.json()
        return HttpResponse.json(jobPost())
      }),
    )

    const input: CompanyJobInput = {
      title: baseExisting.title,
      description: baseExisting.description,
      typeId: baseExisting.typeId,
      city: 'Porto', // changed
      country: baseExisting.country,
      salaryMin: baseExisting.salaryMin,
      salaryMax: baseExisting.salaryMax,
      salaryType: baseExisting.salaryType,
      deadline: baseExisting.deadline,
      published: baseExisting.published,
      skills: baseExisting.skillRows, // unchanged
    }

    const id = await saveJob(input, baseExisting)

    expect(id).toBe(baseExisting.id)
    expect(locationBody).toEqual({ city: 'Porto', country: 'Germany' })
    expect(patchBody).toEqual({ job_location: NEW_LOCATION_ID })
  })
})

// publish toggle + delete ---------------------------------------------------

describe('setJobPublished', () => {
  it('PATCHes is_published', async () => {
    let body: unknown
    server.use(
      http.patch('*/api/v1/jobs/job-posts/:id/', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(jobPost())
      }),
    )
    await setJobPublished(JOB_POST_ID, false)
    expect(body).toEqual({ is_published: false })
  })
})

describe('deleteJob', () => {
  it('DELETEs the job post', async () => {
    let deletedId = ''
    server.use(
      http.delete('*/api/v1/jobs/job-posts/:id/', ({ params }) => {
        deletedId = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await deleteJob(JOB_POST_ID)
    expect(deletedId).toBe(JOB_POST_ID)
  })
})
