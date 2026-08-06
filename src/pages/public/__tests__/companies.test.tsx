/**
 * Companies page on real services: cards with open-role counts, stub rows
 * hidden, search/stream params forwarded.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { paginated, publicCompany, STREAM_ID } from '@/test/msw/fixtures'
import { _resetMetaForTests } from '@/lib/services/meta'
import Companies from '../companies'

function renderCompanies(initialEntry = '/companies') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Companies />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Companies page', () => {
  beforeEach(() => _resetMetaForTests())

  it('renders company cards with open-role counts and hides blank stubs', async () => {
    server.use(
      http.get('*/api/v1/companies/public/', () =>
        HttpResponse.json(
          paginated([
            publicCompany(),
            publicCompany({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', company_name: '' }),
          ]),
        ),
      ),
    )
    renderCompanies()
    expect(await screen.findByText('Halcyon Systems')).toBeInTheDocument()
    expect(screen.getByText('2 open roles')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1) // stub filtered out
  })

  it('sends mapped params when filters come from the URL', async () => {
    const hits: URL[] = []
    server.use(
      http.get('*/api/v1/companies/public/', ({ request }) => {
        hits.push(new URL(request.url))
        return HttpResponse.json(paginated([publicCompany()]))
      }),
    )
    renderCompanies('/companies?search=halcyon&stream=Data%20%26%20AI')
    await screen.findByText('Halcyon Systems')
    const q = hits[hits.length - 1]!.searchParams
    expect(q.get('search')).toBe('halcyon')
    expect(q.get('business_stream')).toBe(STREAM_ID)
  })

  it('shows the empty state when the directory is empty', async () => {
    server.use(
      http.get('*/api/v1/companies/public/', () => HttpResponse.json(paginated([]))),
    )
    renderCompanies('/companies?search=nothing')
    expect(await screen.findByText('No companies found')).toBeInTheDocument()
  })
})
