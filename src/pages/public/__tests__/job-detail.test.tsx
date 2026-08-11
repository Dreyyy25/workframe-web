/**
 * Job detail on real services: nested fields, skills chips, company link,
 * guest CTA, and no deadline UI when deadline is null. Auth is mocked via a
 * hoisted mutable state (defaults to guest) so seeker-mode cases below can
 * flip it without disturbing the guest tests.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import {
  ACCESS_TOKEN,
  JOB_POST_ID,
  PUBLIC_COMPANY_ID,
  SEEKER_ID,
  applicationDto,
  jobPost,
  paginated,
} from '@/test/msw/fixtures'
import type { SessionUser } from '@/lib/auth/session'
import { ToastProvider } from '@/components/ui/toast'
import JobDetail from '../job-detail'

const mockAuth = vi.hoisted(() => ({
  state: {
    user: null as SessionUser | null,
    isLoading: false,
    isSeeker: false,
    isCompany: false,
  },
}))

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => mockAuth.state,
}))

const SEEKER: SessionUser = {
  id: SEEKER_ID,
  type: 'job_seeker',
  name: 'Ava Reyes',
  email: 'ava@example.com',
}

function renderDetail(id = JOB_POST_ID) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`/jobs/${id}`]}>
          <Routes>
            <Route path="/jobs/:id" element={<JobDetail />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('JobDetail', () => {
  beforeEach(() => {
    mockAuth.state = { user: null, isLoading: false, isSeeker: false, isCompany: false }
  })

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

  describe('when signed in as a seeker', () => {
    beforeEach(() => {
      mockAuth.state = { user: SEEKER, isLoading: false, isSeeker: true, isCompany: false }
      setAccessToken(ACCESS_TOKEN)
    })
    afterEach(() => localStorage.clear())

    it('shows a disabled Applied button when the applications cache has this job', async () => {
      // Default handler already returns paginated([applicationDto()]) whose
      // job_post.id === JOB_POST_ID, so no override needed here.
      renderDetail()
      const btn = await screen.findByRole('button', { name: 'Applied' })
      expect(btn).toBeDisabled()
    })

    it('shows "Apply now" when the seeker has no applications for this job', async () => {
      server.use(
        http.get('*/api/v1/jobs/job-applications/', () => HttpResponse.json(paginated([]))),
      )
      renderDetail()
      expect(await screen.findByRole('button', { name: 'Apply now' })).toBeInTheDocument()
    })

    it('still counts a withdrawn application as applied (no re-apply)', async () => {
      server.use(
        http.get('*/api/v1/jobs/job-applications/', () =>
          HttpResponse.json(paginated([applicationDto({ application_status: 'withdrawn' })])),
        ),
      )
      renderDetail()
      const btn = await screen.findByRole('button', { name: 'Applied' })
      expect(btn).toBeDisabled()
    })
  })
})
