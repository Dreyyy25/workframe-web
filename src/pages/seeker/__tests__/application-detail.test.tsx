/**
 * Application detail on real services: job/company/salary/cover-letter
 * fields, the status timeline, and the not-found state for an unknown id.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, APPLICATION_ID } from '@/test/msw/fixtures'
import ApplicationDetail from '../application-detail'

function renderDetail(id = APPLICATION_ID) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/seeker/applications/${id}`]}>
        <Routes>
          <Route path="/seeker/applications/:id" element={<ApplicationDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ApplicationDetail', () => {
  beforeEach(() => setAccessToken(ACCESS_TOKEN))
  afterEach(() => localStorage.clear())

  it('renders the job title, company, salary, cover letter, and status timeline', async () => {
    renderDetail()

    expect(
      await screen.findByRole('link', { name: 'Machine Learning Engineer' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Halcyon Systems')).toBeInTheDocument()
    expect(screen.getByText('$90k–$120k /yr')).toBeInTheDocument()
    expect(screen.getByText('I love this role.')).toBeInTheDocument()
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText('Decision')).toBeInTheDocument()
  })

  it('shows the not-found state for an unknown application id', async () => {
    renderDetail('00000000-0000-4000-8000-000000000000')
    expect(await screen.findByText('Application not found')).toBeInTheDocument()
  })
})
