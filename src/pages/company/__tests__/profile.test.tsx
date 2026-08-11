/**
 * Company profile page on real services: console-backed form (name/website/
 * description/stream select bound to streamId), save PATCH mapping + the
 * post-save session refresh (topbar shows the company name), the Active/
 * Inactive visibility toggle, the suspended-mode badge that replaces the
 * toggle without blocking other edits, and image add/remove by id.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import {
  ACCESS_TOKEN,
  COMPANY_IMAGE_ID,
  STREAM_ID,
  companyAccount,
  companyDashboard,
  companyImageDto,
} from '@/test/msw/fixtures'
import { ToastProvider } from '@/components/ui/toast'
import CompanyProfile from '../profile'

const { refreshUser } = vi.hoisted(() => ({ refreshUser: vi.fn() }))

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'company-user-1', type: 'company', name: 'Northwind Labs', email: 'team@northwind.dev' },
    isLoading: false,
    isSeeker: false,
    isCompany: true,
    refreshUser,
  }),
}))

function renderProfile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
  const rendered = render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/company/profile']}>
          <CompanyProfile />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { ...rendered, invalidateSpy }
}

describe('CompanyProfile', () => {
  beforeEach(() => {
    setAccessToken(ACCESS_TOKEN)
    refreshUser.mockClear()
    server.use(http.get('*/api/v1/accounts/me/', () => HttpResponse.json(companyAccount())))
  })
  afterEach(() => localStorage.clear())

  it('renders console data: name/website/description and the stream select bound to streamId', async () => {
    server.use(
      http.get('*/api/v1/companies/dashboard/:id/', () =>
        HttpResponse.json(
          companyDashboard({
            company: {
              ...companyDashboard().company,
              company_website_url: 'https://northwind.dev',
              profile_description: 'We build data platforms.',
            },
          }),
        ),
      ),
    )
    renderProfile()

    expect(await screen.findByDisplayValue('Northwind Labs')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://northwind.dev')).toBeInTheDocument()
    expect(screen.getByDisplayValue('We build data platforms.')).toBeInTheDocument()

    await screen.findByRole('option', { name: 'Data & AI' })
    await screen.findByRole('option', { name: 'Software' })
    const select = screen.getByLabelText(/Business stream/) as HTMLSelectElement
    expect(select.value).toBe(STREAM_ID)
  })

  it('save PATCHes the mapped body and calls refreshUser so the topbar name refreshes', async () => {
    const user = userEvent.setup()
    let body: Record<string, unknown> = {}
    server.use(
      http.patch('*/api/v1/companies/profile/:id/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(companyDashboard().company)
      }),
    )
    renderProfile()

    const nameInput = await screen.findByDisplayValue('Northwind Labs')
    await user.clear(nameInput)
    await user.type(nameInput, 'Northwind Labs Inc')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Company profile saved')).toBeInTheDocument()
    expect(body).toEqual({
      company_name: 'Northwind Labs Inc',
      business_stream: STREAM_ID,
      status: 'active',
      company_website_url: '',
      profile_description: '',
    })
    expect(refreshUser).toHaveBeenCalledTimes(1)
  })

  it('the visibility toggle flips active/inactive and the save PATCH carries the new status', async () => {
    const user = userEvent.setup()
    let body: Record<string, unknown> = {}
    server.use(
      http.patch('*/api/v1/companies/profile/:id/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(companyDashboard().company)
      }),
    )
    renderProfile()

    const toggle = await screen.findByRole('checkbox', { name: /Visible in the public directory/ })
    expect(toggle).toBeChecked()
    await user.click(toggle)
    expect(toggle).not.toBeChecked()

    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(body.status).toBe('inactive'))
  })

  it('a suspended fixture renders the "Suspended by admin" badge, no toggle, and other fields stay editable', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('*/api/v1/companies/dashboard/:id/', () =>
        HttpResponse.json(
          companyDashboard({ company: { ...companyDashboard().company, status: 'suspended' } }),
        ),
      ),
    )
    renderProfile()

    expect(await screen.findByText('Suspended by admin')).toBeInTheDocument()
    expect(screen.getByText('Contact support to restore your listing.')).toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: /Visible in the public directory/ }),
    ).not.toBeInTheDocument()

    const nameInput = screen.getByDisplayValue('Northwind Labs') as HTMLInputElement
    expect(nameInput).not.toBeDisabled()
    await user.type(nameInput, ' Renamed')
    expect(nameInput).toHaveValue('Northwind Labs Renamed')
  })

  it('the add-image modal POSTs image_url and invalidates company-console', async () => {
    const user = userEvent.setup()
    let posted: Record<string, unknown> = {}
    server.use(
      http.post('*/api/v1/companies/company-images/', async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          companyImageDto({ id: 'new-img-id', image_url: posted.image_url as string }),
          { status: 201 },
        )
      }),
    )
    const { invalidateSpy } = renderProfile()

    await user.click(await screen.findByRole('button', { name: 'Upload image' }))
    const urlInput = await screen.findByLabelText(/Image URL/)
    await user.type(urlInput, 'https://cdn.example.com/photo.jpg')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Image added')).toBeInTheDocument()
    expect(posted).toEqual({ image_url: 'https://cdn.example.com/photo.jpg' })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['company-console'] })
  })

  it('the remove button DELETEs by image id and invalidates company-console', async () => {
    const user = userEvent.setup()
    let deletedId = ''
    server.use(
      http.delete('*/api/v1/companies/company-images/:id/', ({ params }) => {
        deletedId = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { invalidateSpy } = renderProfile()

    await user.click(await screen.findByRole('button', { name: 'Remove image' }))

    expect(await screen.findByText('Image removed')).toBeInTheDocument()
    expect(deletedId).toBe(COMPANY_IMAGE_ID)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['company-console'] })
  })
})
