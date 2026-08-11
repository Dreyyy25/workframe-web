/**
 * Seeker applications on real services: row content, withdraw PATCH capture
 * with a success toast that invalidates both the list and the detail cache,
 * and the error-toast path on a failed withdraw.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, APPLICATION_ID } from '@/test/msw/fixtures'
import { ToastProvider } from '@/components/ui/toast'
import Applications from '../applications'

function renderApplications() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
  const rendered = render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/seeker/applications']}>
          <Applications />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { ...rendered, invalidateSpy }
}

describe('SeekerApplications', () => {
  beforeEach(() => setAccessToken(ACCESS_TOKEN))
  afterEach(() => localStorage.clear())

  it('renders the application row with job, company, date, and status badge', async () => {
    renderApplications()
    const row = (await screen.findByText('Machine Learning Engineer')).closest('li')!
    expect(within(row).getByText(/Halcyon Systems/)).toBeInTheDocument()
    expect(within(row).getByText(/Aug 5, 2026/)).toBeInTheDocument()
    expect(within(row).getByText('Pending')).toBeInTheDocument()
  })

  it('withdraws an application, shows a success toast, and invalidates the list and detail caches', async () => {
    const user = userEvent.setup()
    const patches: Array<{ id: string; body: unknown }> = []
    server.use(
      http.patch('*/api/v1/jobs/job-applications/:id/', async ({ request, params }) => {
        patches.push({ id: params.id as string, body: await request.json() })
        return HttpResponse.json({ id: APPLICATION_ID, application_status: 'withdrawn' })
      }),
    )
    const { invalidateSpy } = renderApplications()

    await user.click(await screen.findByRole('button', { name: 'Withdraw' }))

    expect(await screen.findByText('Application withdrawn')).toBeInTheDocument()
    expect(patches).toEqual([{ id: APPLICATION_ID, body: { application_status: 'withdrawn' } }])
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['applications'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['application', APPLICATION_ID] })
  })

  it('shows an error toast when the withdraw request fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.patch('*/api/v1/jobs/job-applications/:id/', () =>
        HttpResponse.json({ error: 'Cannot withdraw a reviewed application' }, { status: 400 }),
      ),
    )
    renderApplications()

    await user.click(await screen.findByRole('button', { name: 'Withdraw' }))

    expect(
      await screen.findByText('Cannot withdraw a reviewed application'),
    ).toBeInTheDocument()
  })
})
