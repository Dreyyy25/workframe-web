/** Seeker services: composite profile, field fan-out, month/date adapters. */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, SEEKER_ID, educationDto, seekerDashboard } from '@/test/msw/fixtures'
import {
  addEducation, addSkill, getSeekerProfile, updateSeekerProfile,
} from '../seeker'

beforeEach(() => setAccessToken(ACCESS_TOKEN))

describe('getSeekerProfile', () => {
  it('composes dashboard + account into the screen shape', async () => {
    const p = await getSeekerProfile()
    expect(p).toMatchObject({
      id: SEEKER_ID, firstName: 'Ava', lastName: 'Reyes',
      email: 'ava@example.com', contact: '+49 111',
      goals: 'Ship ML systems.', resumeUrl: 'https://cv.example/ava.pdf',
      dob: '', sex: 'Other', photo: '',
    })
    expect(p.education[0]).toEqual({
      id: educationDto().id, school: 'TU Berlin', degree: 'Master',
      field: 'Computer Science', start: '2019-09', end: '2021-07', percentage: 85,
    })
    expect(p.experience[0]).toMatchObject({ company: 'Vertex Data', start: '2021-08', end: '' })
    expect(p.skills[0]).toMatchObject({ name: 'Python', level: 'Advanced' })
  })
})

describe('updateSeekerProfile', () => {
  it('fans profile fields to the seeker PATCH and account fields to /me/', async () => {
    const hits: { url: string; body: unknown }[] = []
    server.use(
      http.patch('*/api/v1/seekers/profiles/:id/', async ({ request }) => {
        hits.push({ url: request.url, body: await request.json() })
        return HttpResponse.json({})
      }),
      http.patch('*/api/v1/accounts/me/', async ({ request }) => {
        hits.push({ url: request.url, body: await request.json() })
        return HttpResponse.json({})
      }),
    )
    await updateSeekerProfile({ firstName: 'Maya', dob: '1999-01-31', sex: 'F', photo: 'https://p/x.png' })
    expect(hits).toHaveLength(2)
    const seekerHit = hits.find((h) => h.url.includes('/seekers/'))!
    const meHit = hits.find((h) => h.url.includes('/accounts/me/'))!
    expect(seekerHit.url).toContain(SEEKER_ID)
    expect(seekerHit.body).toEqual({ first_name: 'Maya' })
    expect(meHit.body).toEqual({ date_of_birth: '1999-01-31', sex: 'F', user_image_url: 'https://p/x.png' })
  })

  it('sends only the seeker PATCH when no account fields are present', async () => {
    const seekerUrls: string[] = []
    const accountUrls: string[] = []
    server.use(
      http.patch('*/api/v1/seekers/profiles/:id/', ({ request }) => {
        seekerUrls.push(request.url)
        return HttpResponse.json({})
      }),
      http.patch('*/api/v1/accounts/me/', ({ request }) => {
        accountUrls.push(request.url)
        return HttpResponse.json({})
      }),
    )
    await updateSeekerProfile({ goals: 'New goals', resumeUrl: '', contact: '+1' })
    expect(seekerUrls).toHaveLength(1)
    expect(accountUrls).toHaveLength(0)
  })

  it('sends only the account PATCH when no profile fields are present', async () => {
    const seekerUrls: string[] = []
    const accountUrls: string[] = []
    server.use(
      http.patch('*/api/v1/seekers/profiles/:id/', ({ request }) => {
        seekerUrls.push(request.url)
        return HttpResponse.json({})
      }),
      http.patch('*/api/v1/accounts/me/', ({ request }) => {
        accountUrls.push(request.url)
        return HttpResponse.json({})
      }),
    )
    await updateSeekerProfile({ dob: '1999-01-31', sex: 'F' })
    expect(accountUrls).toHaveLength(1)
    expect(seekerUrls).toHaveLength(0)
  })
})

describe('education + skills adapters', () => {
  it('maps months to first-of-month dates and blank end to null', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.post('*/api/v1/seekers/education/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(educationDto(), { status: 201 })
      }),
    )
    await addEducation({ school: 'TU Berlin', degree: 'Master', field: 'CS', start: '2019-09', end: '', percentage: null })
    expect(body).toMatchObject({
      institute_university_name: 'TU Berlin', degree_type: 'Master',
      field_of_study: 'CS', start_date: '2019-09-01', end_date: null, percentage: null,
    })
  })

  it('addSkill posts skill_name and returns the input name', async () => {
    const s = await addSkill({ name: 'Terraform', level: 'Advanced' })
    expect(s).toMatchObject({ name: 'Terraform', level: 'Advanced' })
    expect(s.id).toBeTruthy()
  })
})
