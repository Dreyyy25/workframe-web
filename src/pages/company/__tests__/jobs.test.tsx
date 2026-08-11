/**
 * Company jobs list on real services: row content with a derived applicant
 * count (from the shared applications list, grouped by jobId), the
 * publish-toggle PATCH + cache invalidation, and delete PATCH + row removal
 * after refetch.
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
import Jobs from '../jobs'

const JOB_A_ID = 'job-a'
const JOB_B_ID = 'job-b'

function twoJobs() {
  return [
    jobPost({
      id: JOB_A_ID,
      job_title: 'Frontend Engineer',
      is_published: true,
      created_at: '2026-08-01T10:00:00Z',
    }),
    jobPost({
      id: JOB_B_ID,
      job_title: 'Data Analyst',
      is_published: false,
      job_type: { id: 'contract-type', job_type_name: 'Contract' },
      created_at: '2026-08-02T10:00:00Z',
    }),
  ]
}

function renderJobs() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
  const rendered = render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/company/jobs']}>
          <Jobs />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { ...rendered, invalidateSpy }
}

describe('CompanyJobs', () => {
  beforeEach(() => {
    setAccessToken(ACCESS_TOKEN)
    server.use(http.get('*/api/v1/accounts/me/', () => HttpResponse.json(companyAccount())))
  })
  afterEach(() => localStorage.clear())

  it('renders a row per job with title/type/salary/published badge and a derived applicant count', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () => HttpResponse.json(paginated(twoJobs()))),
      http.get('*/api/v1/jobs/job-applications/', () =>
        HttpResponse.json(
          paginated([
            applicationDto({ id: 'app-1', job_post: { ...applicationDto().job_post, id: JOB_A_ID } }),
            applicationDto({ id: 'app-2', job_post: { ...applicationDto().job_post, id: JOB_A_ID } }),
            applicationDto({ id: 'app-3', job_post: { ...applicationDto().job_post, id: JOB_A_ID } }),
            applicationDto({ id: 'app-4', job_post: { ...applicationDto().job_post, id: JOB_B_ID } }),
          ]),
        ),
      ),
    )
    renderJobs()

    const feRow = (await screen.findByText('Frontend Engineer')).closest('tr')!
    expect(within(feRow).getByText('Full-time')).toBeInTheDocument()
    expect(within(feRow).getByText('$90k–$120k /yr')).toBeInTheDocument()
    expect(within(feRow).getByText('Published')).toBeInTheDocument()
    expect(within(feRow).getByText('3')).toBeInTheDocument()

    const daRow = screen.getByText('Data Analyst').closest('tr')!
    expect(within(daRow).getByText('Contract')).toBeInTheDocument()
    expect(within(daRow).getByText('Closed')).toBeInTheDocument()
    expect(within(daRow).getByText('1')).toBeInTheDocument()
  })

  it('publish-toggle PATCHes is_published and invalidates company-jobs + company-console', async () => {
    const user = userEvent.setup()
    const patches: Array<{ id: string; body: unknown }> = []
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () => HttpResponse.json(paginated(twoJobs()))),
      http.get('*/api/v1/jobs/job-applications/', () => HttpResponse.json(paginated([]))),
      http.patch('*/api/v1/jobs/job-posts/:id/', async ({ request, params }) => {
        patches.push({ id: params.id as string, body: await request.json() })
        return HttpResponse.json(jobPost({ id: params.id as string, is_published: false }))
      }),
    )
    const { invalidateSpy } = renderJobs()

    const feRow = (await screen.findByText('Frontend Engineer')).closest('tr')!
    await user.click(within(feRow).getByRole('button', { name: 'Close' }))

    expect(await screen.findByText('Post closed')).toBeInTheDocument()
    expect(patches).toEqual([{ id: JOB_A_ID, body: { is_published: false } }])
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['company-jobs'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['company-console'] })
  })

  it('delete DELETEs the job and the row disappears after refetch', async () => {
    const user = userEvent.setup()
    let jobs = twoJobs()
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () => HttpResponse.json(paginated(jobs))),
      http.get('*/api/v1/jobs/job-applications/', () => HttpResponse.json(paginated([]))),
      http.delete('*/api/v1/jobs/job-posts/:id/', ({ params }) => {
        jobs = jobs.filter((j) => j.id !== params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { invalidateSpy } = renderJobs()

    const daRow = (await screen.findByText('Data Analyst')).closest('tr')!
    await user.click(within(daRow).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Post deleted')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Data Analyst')).not.toBeInTheDocument())
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['company-jobs'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['company-console'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['applications'] })
  })
})
