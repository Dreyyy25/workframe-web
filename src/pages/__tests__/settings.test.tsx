/**
 * Account settings on real services: email is read-only display (no longer
 * patched), the account save PATCHes /accounts/me/ without an email key, and
 * the password form is a real mutation against /accounts/change-password/ —
 * local mismatch guard, success toast, and the backend's 400 message surfaced
 * verbatim.
 *
 * Company accounts have no seeker profile: the profile query must be gated
 * off (no doomed dashboard call) and only the password card should render.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN } from '@/test/msw/fixtures'
import { ToastProvider } from '@/components/ui/toast'
import Settings from '../settings'

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(() => ({
    user: { id: 'seeker-1', type: 'job_seeker', name: 'Ava Reyes', email: 'ava@example.com' },
    isLoading: false,
    isSeeker: true,
    isCompany: false,
    refreshUser: vi.fn(),
  })),
}))

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: useAuthMock,
}))

function renderSettings() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/settings']}>
          <Settings />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('Settings', () => {
  beforeEach(() => {
    setAccessToken(ACCESS_TOKEN)
    useAuthMock.mockReturnValue({
      user: { id: 'seeker-1', type: 'job_seeker', name: 'Ava Reyes', email: 'ava@example.com' },
      isLoading: false,
      isSeeker: true,
      isCompany: false,
      refreshUser: vi.fn(),
    })
  })
  afterEach(() => localStorage.clear())

  it('renders the email field as read-only', async () => {
    renderSettings()
    expect(await screen.findByLabelText('Email')).toBeDisabled()
  })

  it('saves the account, PATCHing /accounts/me/ without an email key', async () => {
    const user = userEvent.setup()
    const patches: unknown[] = []
    server.use(
      http.patch('*/api/v1/accounts/me/', async ({ request }) => {
        patches.push(await request.json())
        return HttpResponse.json({})
      }),
    )
    renderSettings()

    await screen.findByLabelText('Email')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Account updated')).toBeInTheDocument()
    expect(patches).toEqual([{ date_of_birth: null, sex: 'Other', user_image_url: '' }])
  })

  it('shows a local error and makes no request when the new passwords mismatch', async () => {
    const user = userEvent.setup()
    const posts: unknown[] = []
    server.use(
      http.post('*/api/v1/accounts/change-password/', async ({ request }) => {
        posts.push(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderSettings()

    await user.type(await screen.findByLabelText('Current password'), 'oldpassword1')
    await user.type(screen.getByLabelText('New password'), 'newpassword1')
    await user.type(screen.getByLabelText('Confirm new password'), 'doesNotMatch')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Passwords don’t match.')).toBeInTheDocument()
    expect(posts).toHaveLength(0)
  })

  it('changes the password, posting current/new and toasting on success', async () => {
    const user = userEvent.setup()
    const posts: Array<{ current_password: string; new_password: string }> = []
    server.use(
      http.post('*/api/v1/accounts/change-password/', async ({ request }) => {
        posts.push((await request.json()) as { current_password: string; new_password: string })
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderSettings()

    await user.type(await screen.findByLabelText('Current password'), 'oldpassword1')
    await user.type(screen.getByLabelText('New password'), 'newpassword1')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpassword1')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Password changed')).toBeInTheDocument()
    expect(posts).toEqual([{ current_password: 'oldpassword1', new_password: 'newpassword1' }])
  })

  it('surfaces the backend 400 message when the current password is wrong', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/accounts/change-password/', () =>
        HttpResponse.json({ current_password: ['Incorrect password.'] }, { status: 400 }),
      ),
    )
    renderSettings()

    await user.type(await screen.findByLabelText('Current password'), 'wrongpassword')
    await user.type(screen.getByLabelText('New password'), 'newpassword1')
    await user.type(screen.getByLabelText('Confirm new password'), 'newpassword1')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Incorrect password.')).toBeInTheDocument()
  })

  it('for a company account, never calls the seeker dashboard and hides the profile form', async () => {
    useAuthMock.mockReturnValue({
      user: { id: 'company-1', type: 'company', name: 'Northwind Labs', email: 'team@northwind.dev' },
      isLoading: false,
      isSeeker: false,
      isCompany: true,
      refreshUser: vi.fn(),
    })
    let dashboardHits = 0
    server.use(
      http.get('*/api/v1/seekers/dashboard/:id/', () => {
        dashboardHits += 1
        return HttpResponse.json({ detail: 'Not found.' }, { status: 404 })
      }),
    )
    renderSettings()

    expect(await screen.findByRole('heading', { name: 'Password' })).toBeInTheDocument()
    expect(
      screen.getByText('Profile details are managed from your company profile.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Contact number')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(dashboardHits).toBe(0)
  })
})
