/**
 * Seeker dashboard on real services: greeting from the session user, stat
 * counts derived from live applications, recent-application rows, and the
 * recommended-jobs rail (Slice-2's real listJobs, publicly served).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN } from '@/test/msw/fixtures'
import Dashboard from '../dashboard'

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'seeker-1', type: 'job_seeker', name: 'Ava Reyes', email: 'ava@example.com' },
    isLoading: false,
    isSeeker: true,
    isCompany: false,
  }),
}))

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/seeker/dashboard']}>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SeekerDashboard', () => {
  beforeEach(() => setAccessToken(ACCESS_TOKEN))
  afterEach(() => localStorage.clear())

  it('greets the seeker and shows stat counts, recent applications, and recommended jobs', async () => {
    renderDashboard()

    expect(await screen.findByText('Welcome back, Ava')).toBeInTheDocument()

    const totalCard = (await screen.findByText('Total applications')).parentElement!
    expect(within(totalCard).getByText('1')).toBeInTheDocument()

    const recent = screen.getByText('Recent applications').closest('section')!
    expect(within(recent).getByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(within(recent).getByText(/Halcyon Systems/)).toBeInTheDocument()

    const recommended = screen.getByText('Recommended for you').closest('section')!
    expect(await within(recommended).findByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(within(recommended).getByText('Halcyon Systems')).toBeInTheDocument()
  })
})
