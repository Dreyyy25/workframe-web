/**
 * Companies services: public-directory adapter (protocol strip, initials,
 * stub filtering), images on retrieve, null on 404.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { PUBLIC_COMPANY_ID, paginated, publicCompany, publicCompanyDetail } from '@/test/msw/fixtures'
import { _resetMetaForTests } from '../meta'
import { getCompany, listCompanies } from '../companies'

describe('listCompanies', () => {
  beforeEach(() => _resetMetaForTests())

  it('adapts rows: name, stream, stripped website, initials logo, openRolesCount', async () => {
    const [c] = await listCompanies()
    expect(c).toMatchObject({
      id: PUBLIC_COMPANY_ID,
      name: 'Halcyon Systems',
      stream: 'Data & AI',
      website: 'halcyon.io',
      status: 'active',
      description: 'We build data platforms.',
      logo: 'HS',
      openRolesCount: 2,
      images: [],
    })
  })

  it('hides blank-named stub companies', async () => {
    server.use(
      http.get('*/api/v1/companies/public/', () =>
        HttpResponse.json(paginated([publicCompany(), publicCompany({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', company_name: '' })])),
      ),
    )
    const rows = await listCompanies()
    expect(rows).toHaveLength(1)
  })

  it('hides whitespace-only named stub companies', async () => {
    server.use(
      http.get('*/api/v1/companies/public/', () =>
        HttpResponse.json(paginated([publicCompany(), publicCompany({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', company_name: '   ' })])),
      ),
    )
    const rows = await listCompanies()
    expect(rows).toHaveLength(1)
  })

  it('passes search/stream params; unknown stream short-circuits to []', async () => {
    const hits: URL[] = []
    server.use(
      http.get('*/api/v1/companies/public/', ({ request }) => {
        hits.push(new URL(request.url))
        return HttpResponse.json(paginated([publicCompany()]))
      }),
    )
    await listCompanies({ search: 'halcyon', stream: 'Data & AI' })
    expect(hits[0].searchParams.get('search')).toBe('halcyon')
    expect(hits[0].searchParams.get('business_stream')).toBeTruthy()

    expect(await listCompanies({ stream: 'Bogus' })).toEqual([])
    expect(hits).toHaveLength(1)
  })
})

describe('getCompany', () => {
  it('returns the detail shape with image URLs', async () => {
    const c = await getCompany(PUBLIC_COMPANY_ID)
    expect(c?.images).toEqual(['https://img.example/office.jpg'])
    expect(c?.logo).toBe('HS')
  })

  it('returns null on 404', async () => {
    expect(await getCompany('00000000-0000-4000-8000-000000000000')).toBeNull()
  })

  it('returns null for a blank-named stub company', async () => {
    server.use(
      http.get('*/api/v1/companies/public/:id/', () =>
        HttpResponse.json(publicCompanyDetail({ company_name: '' })),
      ),
    )
    const c = await getCompany(PUBLIC_COMPANY_ID)
    expect(c).toBeNull()
  })
})
