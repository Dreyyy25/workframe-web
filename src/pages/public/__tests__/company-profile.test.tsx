/**
 * Company profile on real services: header, gallery from retrieve images,
 * open roles fetched via listCompanyRoles.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PUBLIC_COMPANY_ID } from '@/test/msw/fixtures'
import CompanyProfile from '../company-profile'

function renderProfile(id = PUBLIC_COMPANY_ID) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/companies/${id}`]}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyProfile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CompanyProfile', () => {
  it('renders header, gallery, and open roles from the API', async () => {
    renderProfile()
    expect(await screen.findByRole('heading', { name: 'Halcyon Systems' })).toBeInTheDocument()
    expect(screen.getByText('Data & AI')).toBeInTheDocument()
    expect(screen.getByAltText('Halcyon Systems workplace')).toHaveAttribute(
      'src',
      'https://img.example/office.jpg',
    )
    expect(await screen.findByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Visit website/ })).toHaveAttribute(
      'href',
      'https://halcyon.io',
    )
  })

  it('shows the not-found state for a missing company', async () => {
    renderProfile('00000000-0000-4000-8000-000000000000')
    expect(await screen.findByText('Company not found')).toBeInTheDocument()
  })
})
