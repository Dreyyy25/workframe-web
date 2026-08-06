/**
 * FeaturedJobs after the nested-read migration: one request to job-posts,
 * no join fetches, company names rendered from the nested payload.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { jobPost, paginated } from '@/test/msw/fixtures'
import { FeaturedJobs } from '../featured-jobs'

function renderFeatured() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <FeaturedJobs />
    </QueryClientProvider>,
  )
}

describe('FeaturedJobs', () => {
  it('renders nested API data with company names from a single request', async () => {
    const hits: string[] = []
    server.use(
      http.get('*/api/v1/jobs/job-posts/', ({ request }) => {
        hits.push(request.url)
        return HttpResponse.json(paginated([jobPost()]))
      }),
    )
    renderFeatured()
    expect(await screen.findByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(screen.getByText('Halcyon Systems')).toBeInTheDocument()
    expect(screen.getByText('Berlin, Germany')).toBeInTheDocument()
    expect(hits).toHaveLength(1)
    expect(hits[0]).toContain('page_size=6')
  })

  it('falls back to seed content when the API errors', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () => HttpResponse.error()),
    )
    renderFeatured()
    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument()
  })
})
