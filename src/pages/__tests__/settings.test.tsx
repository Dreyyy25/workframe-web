/**
 * Account settings on real services: email is read-only display (no longer
 * patched), the account save PATCHes /accounts/me/ without an email key, and
 * the password form is a real mutation against /accounts/change-password/ —
 * local mismatch guard, success toast, and the backend's 400 message surfaced
 * verbatim.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN } from '@/test/msw/fixtures'
import { ToastProvider } from '@/components/ui/toast'
import Settings from '../settings'

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
  beforeEach(() => setAccessToken(ACCESS_TOKEN))
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
})
