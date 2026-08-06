/**
 * Jobs page on real services: renders API fixtures, sends mapped query
 * params, keeps the count headline in sync.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { jobPost, paginated } from '@/test/msw/fixtures'
import { _resetMetaForTests } from '@/lib/services/meta'
import Jobs from '../jobs'

function renderJobs(initialEntry = '/jobs') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Jobs />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Jobs page', () => {
  beforeEach(() => _resetMetaForTests())

  it('renders jobs and the result count from the API', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () =>
        HttpResponse.json({ ...paginated([jobPost()]), count: 12 }),
      ),
    )
    renderJobs()
    expect(await screen.findByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(screen.getByText('12 open roles')).toBeInTheDocument()
    expect(screen.getByText('Halcyon Systems')).toBeInTheDocument()
  })

  it('sends mapped params when filters come from the URL', async () => {
    const hits: URL[] = []
    server.use(
      http.get('*/api/v1/jobs/job-posts/', ({ request }) => {
        hits.push(new URL(request.url))
        return HttpResponse.json(paginated([jobPost()]))
      }),
    )
    renderJobs('/jobs?type=Full-time&sort=salary&minSalary=100000')
    await screen.findByText('Machine Learning Engineer')
    const q = hits[hits.length - 1]!.searchParams
    expect(q.get('job_type')).toBeTruthy()
    expect(q.get('ordering')).toBe('-salary_rank')
    expect(q.get('salary_floor')).toBe('100000')
  })

  it('shows the empty state when nothing matches', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () => HttpResponse.json(paginated([]))),
    )
    renderJobs('/jobs?search=nothing')
    expect(await screen.findByText('No roles match your filters')).toBeInTheDocument()
  })

  it('populates the type and category selects from the API', async () => {
    renderJobs()
    const user = userEvent.setup()
    // options load async from the meta queries — await them before selecting
    await screen.findByRole('option', { name: 'Full-time' })
    await screen.findByRole('option', { name: 'Data & AI' })
    await user.selectOptions(screen.getByLabelText('Job type'), 'Full-time')
  })
})
