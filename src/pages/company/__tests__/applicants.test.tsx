/**
 * Company applicants list on real services: card content (name/job-title
 * badge/applied date/status badge, no mock's "title · N yrs" line), ?job=
 * client-side filtering from the shared applications cache, accept/reject
 * transition-matrix gating, and withdrawn rows hiding action buttons
 * entirely.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, applicationDto, companyAccount, jobPost, paginated } from '@/test/msw/fixtures'
import { ToastProvider } from '@/components/ui/toast'
import Applicants from '../applicants'

const JOB_A_ID = 'job-a'
const JOB_B_ID = 'job-b'

function twoJobs() {
  return [
    jobPost({ id: JOB_A_ID, job_title: 'Frontend Engineer' }),
    jobPost({ id: JOB_B_ID, job_title: 'Data Analyst' }),
  ]
}

function jobRef(id: string, title: string) {
  return { ...applicationDto().job_post, id, job_title: title }
}

function renderApplicants(path = '/company/applicants') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
  const rendered = render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Applicants />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { ...rendered, invalidateSpy }
}

describe('CompanyApplicants', () => {
  beforeEach(() => {
    setAccessToken(ACCESS_TOKEN)
    server.use(http.get('*/api/v1/accounts/me/', () => HttpResponse.json(companyAccount())))
  })
  afterEach(() => localStorage.clear())

  it('renders name, job-title badge, applied date, and status badge with no title/years line', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-applications/', () =>
        HttpResponse.json(paginated([applicationDto()])),
      ),
    )
    renderApplicants()

    const row = (await screen.findByText('Avery Quinn')).closest('li')!
    expect(within(row).getByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(within(row).getByText('Applied Aug 5, 2026')).toBeInTheDocument()
    expect(within(row).getByText('Pending')).toBeInTheDocument()
    expect(within(row).queryByText(/yrs/)).not.toBeInTheDocument()
  })

  it('?job= filters the list client-side from the shared applications cache', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () => HttpResponse.json(paginated(twoJobs()))),
      http.get('*/api/v1/jobs/job-applications/', () =>
        HttpResponse.json(
          paginated([
            applicationDto({
              id: 'app-a',
              job_post: jobRef(JOB_A_ID, 'Frontend Engineer'),
              applicant: { id: 'seeker-a', first_name: 'Avery', last_name: 'Quinn' },
            }),
            applicationDto({
              id: 'app-b',
              job_post: jobRef(JOB_B_ID, 'Data Analyst'),
              applicant: { id: 'seeker-b', first_name: 'Bea', last_name: 'Bly' },
            }),
          ]),
        ),
      ),
    )
    renderApplicants(`/company/applicants?job=${JOB_A_ID}`)

    expect(await screen.findByText('Avery Quinn')).toBeInTheDocument()
    expect(screen.queryByText('Bea Bly')).not.toBeInTheDocument()
  })

  it('Accept/Reject are enabled for pending/reviewed and disabled for accepted/rejected', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-applications/', () =>
        HttpResponse.json(
          paginated([
            applicationDto({
              id: 'app-pending', application_status: 'pending',
              applicant: { id: 's1', first_name: 'Pat', last_name: 'One' },
            }),
            applicationDto({
              id: 'app-reviewed', application_status: 'reviewed',
              applicant: { id: 's2', first_name: 'Rae', last_name: 'Two' },
            }),
            applicationDto({
              id: 'app-accepted', application_status: 'accepted',
              applicant: { id: 's3', first_name: 'Al', last_name: 'Three' },
            }),
            applicationDto({
              id: 'app-rejected', application_status: 'rejected',
              applicant: { id: 's4', first_name: 'Rex', last_name: 'Four' },
            }),
          ]),
        ),
      ),
    )
    renderApplicants()

    const pendingRow = (await screen.findByText('Pat One')).closest('li')!
    expect(within(pendingRow).getByRole('button', { name: 'Accept' })).toBeEnabled()
    expect(within(pendingRow).getByRole('button', { name: 'Reject' })).toBeEnabled()

    const reviewedRow = screen.getByText('Rae Two').closest('li')!
    expect(within(reviewedRow).getByRole('button', { name: 'Accept' })).toBeEnabled()
    expect(within(reviewedRow).getByRole('button', { name: 'Reject' })).toBeEnabled()

    const acceptedRow = screen.getByText('Al Three').closest('li')!
    expect(within(acceptedRow).getByRole('button', { name: 'Accept' })).toBeDisabled()
    expect(within(acceptedRow).getByRole('button', { name: 'Reject' })).toBeDisabled()

    const rejectedRow = screen.getByText('Rex Four').closest('li')!
    expect(within(rejectedRow).getByRole('button', { name: 'Accept' })).toBeDisabled()
    expect(within(rejectedRow).getByRole('button', { name: 'Reject' })).toBeDisabled()
  })

  it('a withdrawn row shows the status badge and no action buttons', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-applications/', () =>
        HttpResponse.json(paginated([applicationDto({ id: 'app-w', application_status: 'withdrawn' })])),
      ),
    )
    renderApplicants()

    const row = (await screen.findByText('Avery Quinn')).closest('li')!
    expect(within(row).getByText('Withdrawn')).toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(within(row).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
  })

  it('clicking Accept PATCHes application_status and invalidates applications + application-detail', async () => {
    const user = userEvent.setup()
    let body: Record<string, unknown> = {}
    server.use(
      http.get('*/api/v1/jobs/job-applications/', () =>
        HttpResponse.json(paginated([applicationDto({ id: 'app-1', application_status: 'pending' })])),
      ),
      http.patch('*/api/v1/jobs/job-applications/:id/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: 'app-1', application_status: 'accepted' })
      }),
    )
    const { invalidateSpy } = renderApplicants()

    const row = (await screen.findByText('Avery Quinn')).closest('li')!
    await user.click(within(row).getByRole('button', { name: 'Accept' }))

    await waitFor(() => expect(body).toEqual({ application_status: 'accepted' }))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['applications'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['application-detail'] })
  })
})
