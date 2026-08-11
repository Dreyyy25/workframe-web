/**
 * Company dashboard on real services: stat counts from the console fixture,
 * and the recent-applicants rail derived from the shared applications list
 * (sorted newest-first, capped at 5, applicant-name fallback).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, applicationDto, companyAccount, paginated } from '@/test/msw/fixtures'
import Dashboard from '../dashboard'

function applicant(id: string, first: string, last: string) {
  return { id, first_name: first, last_name: last }
}

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/company/dashboard']}>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CompanyDashboard', () => {
  beforeEach(() => {
    setAccessToken(ACCESS_TOKEN)
    server.use(http.get('*/api/v1/accounts/me/', () => HttpResponse.json(companyAccount())))
  })
  afterEach(() => localStorage.clear())

  it('renders the three stat values from the console fixture', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-applications/', () => HttpResponse.json(paginated([]))),
    )
    renderDashboard()

    const activeCard = (await screen.findByText('Active posts')).parentElement!
    expect(within(activeCard).getByText('3')).toBeInTheDocument()
    const totalCard = screen.getByText('Total applicants').parentElement!
    expect(within(totalCard).getByText('12')).toBeInTheDocument()
    const newCard = screen.getByText('New this week').parentElement!
    expect(within(newCard).getByText('4')).toBeInTheDocument()
  })

  it('renders up to 5 recent applicants sorted newest-first with name fallback, job title, and status', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-applications/', () =>
        HttpResponse.json(
          paginated([
            applicationDto({
              id: 'app-1',
              application_date: '2026-08-01T09:00:00Z',
              applicant: applicant('s1', 'Alice', 'Adams'),
              application_status: 'pending',
            }),
            applicationDto({
              id: 'app-2',
              application_date: '2026-08-02T09:00:00Z',
              applicant: applicant('s2', 'Bob', 'Baker'),
              application_status: 'reviewed',
            }),
            applicationDto({
              id: 'app-3',
              application_date: '2026-08-03T09:00:00Z',
              applicant: applicant('s3', 'Cara', 'Chen'),
              application_status: 'accepted',
            }),
            applicationDto({
              id: 'app-4',
              application_date: '2026-08-04T09:00:00Z',
              applicant: null,
              application_status: 'pending',
            }),
            applicationDto({
              id: 'app-5',
              application_date: '2026-08-05T09:00:00Z',
              applicant: applicant('s5', 'Eli', 'Evans'),
              application_status: 'rejected',
            }),
            applicationDto({
              id: 'app-6',
              application_date: '2026-08-06T09:00:00Z',
              applicant: applicant('s6', 'Fay', 'Ford'),
              application_status: 'withdrawn',
            }),
          ]),
        ),
      ),
    )
    renderDashboard()

    await screen.findByText('Recent applicants')
    const rows = await screen.findAllByRole('row')
    // rows[0] is the header row; data rows follow, newest first.
    const dataRows = rows.slice(1)
    expect(dataRows).toHaveLength(5)

    expect(within(dataRows[0]).getByText('Fay Ford')).toBeInTheDocument()
    expect(within(dataRows[0]).getByText('Withdrawn')).toBeInTheDocument()
    expect(within(dataRows[0]).getByRole('link')).toHaveAttribute(
      'href',
      '/company/applicants/app-6',
    )

    expect(within(dataRows[1]).getByText('Eli Evans')).toBeInTheDocument()
    // app-4 (null applicant) is the 3rd-newest -> falls back to 'Applicant'.
    expect(within(dataRows[2]).getByText('Applicant')).toBeInTheDocument()
    expect(within(dataRows[2]).getByRole('link')).toHaveAttribute(
      'href',
      '/company/applicants/app-4',
    )
    expect(within(dataRows[3]).getByText('Cara Chen')).toBeInTheDocument()
    expect(within(dataRows[4]).getByText('Bob Baker')).toBeInTheDocument()

    // app-1 (Aug 1, oldest) is excluded from the top-5 slice.
    expect(screen.queryByText('Alice Adams')).not.toBeInTheDocument()

    expect(within(dataRows[0]).getByText('Machine Learning Engineer')).toBeInTheDocument()
  })
})
