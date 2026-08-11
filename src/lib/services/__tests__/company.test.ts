/** Company console services: dashboard flatten, stream-name join, profile/image mutations. */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { companyDashboard, BUSINESS_STREAMS_LIST } from '@/test/msw/fixtures'
import { setAccessToken } from '@/lib/api/client'
import { _resetMetaForTests } from '@/lib/services/meta'
import { addCompanyImage, getCompanyConsole, removeCompanyImage, updateCompanyProfile } from '@/lib/services/company'

beforeEach(() => {
  setAccessToken('test-token')
  _resetMetaForTests()
})

describe('getCompanyConsole', () => {
  it('flattens dashboard + joins stream name from meta', async () => {
    const dash = companyDashboard()
    const console_ = await getCompanyConsole()
    // fixtures: BUSINESS_STREAMS_LIST contains the dashboard's stream id
    const expected = BUSINESS_STREAMS_LIST.find((s) => s.id === dash.company.business_stream)
    expect(console_).toEqual({
      companyId: dash.company.id,
      name: dash.company.company_name,
      streamId: dash.company.business_stream,
      streamName: expected ? expected.business_stream_name : null,
      status: dash.company.status,
      website: dash.company.company_website_url,
      description: dash.company.profile_description,
      images: dash.images.map((i) => ({ id: i.id, url: i.image_url })),
      stats: { activePosts: 3, totalApplicants: 12, newThisWeek: 4 },
    })
  })

  it('streamName null when the meta fetch fails', async () => {
    server.use(
      http.get('*/api/v1/companies/business-streams/', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    const console_ = await getCompanyConsole()
    expect(console_.streamName).toBeNull()
  })
})

describe('updateCompanyProfile', () => {
  it('maps view-model keys to API field names and omits untouched keys', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.patch('*/api/v1/companies/profile/:id/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(companyDashboard().company)
      }),
    )
    await updateCompanyProfile('cid-1', { name: 'NewCo', streamId: 'st-1', status: 'inactive' })
    expect(body).toEqual({ company_name: 'NewCo', business_stream: 'st-1', status: 'inactive' })
  })
})

describe('images', () => {
  it('addCompanyImage posts image_url; removeCompanyImage deletes by id', async () => {
    let posted: Record<string, unknown> = {}
    let deletedId = ''
    server.use(
      http.post('*/api/v1/companies/company-images/', async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: 'img-9', company: 'cid-1', image_url: posted.image_url, created_at: '2026-08-10T00:00:00Z' }, { status: 201 })
      }),
      http.delete('*/api/v1/companies/company-images/:id/', ({ params }) => {
        deletedId = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await addCompanyImage('https://cdn.example.com/x.jpg')
    await removeCompanyImage('img-7')
    expect(posted).toEqual({ image_url: 'https://cdn.example.com/x.jpg' })
    expect(deletedId).toBe('img-7')
  })
})
