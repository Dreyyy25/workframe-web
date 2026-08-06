/**
 * Job detail on real services: nested fields, skills chips, company link,
 * guest CTA, and no deadline UI when deadline is null. Auth is mocked as
 * a guest (the page only reads user/isSeeker/isCompany).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { JOB_POST_ID, PUBLIC_COMPANY_ID, jobPost } from '@/test/msw/fixtures'
import JobDetail from '../job-detail'

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: null, isLoading: false, isSeeker: false, isCompany: false }),
}))

function renderDetail(id = JOB_POST_ID) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/jobs/${id}`]}>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('JobDetail', () => {
  it('renders the job with skills and a company link', async () => {
    renderDetail()
    expect(
      await screen.findByRole('heading', { name: 'Machine Learning Engineer' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Halcyon Systems' })).toHaveAttribute(
      'href',
      `/companies/${PUBLIC_COMPANY_ID}`,
    )
    expect(screen.getByRole('button', { name: 'Log in to apply' })).toBeInTheDocument()
    expect(screen.getByText(/Apply by/)).toBeInTheDocument()
  })

  it('omits the deadline UI when deadline_date is null', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/:id/', () =>
        HttpResponse.json(jobPost({ deadline_date: null })),
      ),
    )
    renderDetail()
    await screen.findByRole('heading', { name: 'Machine Learning Engineer' })
    expect(screen.queryByText(/Apply by/)).not.toBeInTheDocument()
    expect(screen.queryByText('Deadline')).not.toBeInTheDocument()
  })

  it('shows the not-found state for a missing job', async () => {
    renderDetail('00000000-0000-4000-8000-000000000000')
    expect(await screen.findByText('Role not found')).toBeInTheDocument()
  })
})
