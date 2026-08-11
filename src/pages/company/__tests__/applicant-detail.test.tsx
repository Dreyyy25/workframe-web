/**
 * Company applicant-detail page on real services: profile content (contact
 * details/resume link/goals/skills/experience/education), the cover letter
 * off the application, the status-action transition matrix (pending / reviewed
 * / terminal), the null-profile fallback (deleted seeker dashboard) which
 * keeps status actions and swaps profile sections for a note, and the
 * not-found state for an unknown application id.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, APPLICATION_ID, applicationDto, companyAccount } from '@/test/msw/fixtures'
import { ToastProvider } from '@/components/ui/toast'
import ApplicantDetail from '../applicant-detail'

function renderDetail(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/company/applicants/:id" element={<ApplicantDetail />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('ApplicantDetail', () => {
  beforeEach(() => {
    setAccessToken(ACCESS_TOKEN)
    server.use(http.get('*/api/v1/accounts/me/', () => HttpResponse.json(companyAccount())))
  })
  afterEach(() => localStorage.clear())

  it('renders name, contact details, resume link, goals, skills, experience, education, and cover letter', async () => {
    renderDetail(`/company/applicants/${APPLICATION_ID}`)

    expect(await screen.findByRole('heading', { name: 'Ava Reyes' })).toBeInTheDocument()
    expect(screen.getByText('+49 111')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View resume' })).toHaveAttribute(
      'href',
      'https://cv.example/ava.pdf',
    )
    expect(screen.getByText('Ship ML systems.')).toBeInTheDocument()
    expect(screen.getByText('Python · Advanced')).toBeInTheDocument()
    expect(screen.getByText(/ML Engineer/)).toBeInTheDocument()
    expect(screen.getByText(/Vertex Data/)).toBeInTheDocument()
    expect(screen.getByText(/TU Berlin/)).toBeInTheDocument()
    expect(screen.getByText('I love this role.')).toBeInTheDocument()
  })

  it('pending status shows Mark reviewed, Accept, and Reject', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-applications/:id/', () =>
        HttpResponse.json(applicationDto({ application_status: 'pending' })),
      ),
    )
    renderDetail(`/company/applicants/${APPLICATION_ID}`)
    await screen.findByRole('heading', { name: 'Ava Reyes' })

    expect(screen.getByRole('button', { name: /Mark reviewed/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Accept/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reject/ })).toBeInTheDocument()
  })

  it('reviewed status shows Accept and Reject only', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-applications/:id/', () =>
        HttpResponse.json(applicationDto({ application_status: 'reviewed' })),
      ),
    )
    renderDetail(`/company/applicants/${APPLICATION_ID}`)
    await screen.findByRole('heading', { name: 'Ava Reyes' })

    expect(screen.queryByRole('button', { name: /Mark reviewed/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Accept/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reject/ })).toBeInTheDocument()
  })

  it.each(['accepted', 'withdrawn'] as const)(
    '%s status shows no status actions',
    async (status) => {
      server.use(
        http.get('*/api/v1/jobs/job-applications/:id/', () =>
          HttpResponse.json(applicationDto({ application_status: status })),
        ),
      )
      renderDetail(`/company/applicants/${APPLICATION_ID}`)
      await screen.findByRole('heading', { name: 'Ava Reyes' })

      expect(screen.queryByRole('button', { name: /Mark reviewed/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Reject/ })).not.toBeInTheDocument()
    },
  )

  it('profile-null mode keeps status actions and shows the profile empty-state note', async () => {
    server.use(
      http.get('*/api/v1/seekers/dashboard/:id/', () =>
        HttpResponse.json({ error: 'Profile not found' }, { status: 404 }),
      ),
    )
    renderDetail(`/company/applicants/${APPLICATION_ID}`)

    expect(
      await screen.findByText("This candidate's profile is no longer available."),
    ).toBeInTheDocument()
    // Falls back to the applicant identity carried on the application itself.
    expect(screen.getByRole('heading', { name: 'Avery Quinn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Mark reviewed/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Accept/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reject/ })).toBeInTheDocument()
  })

  it('unknown application id renders the not-found state', async () => {
    renderDetail('/company/applicants/00000000-0000-4000-8000-000000000000')

    expect(await screen.findByText('Applicant not found')).toBeInTheDocument()
  })
})
