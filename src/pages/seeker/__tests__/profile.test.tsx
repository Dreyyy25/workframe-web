/**
 * Seeker profile on real services: header identity, education/skills tab
 * content from the seeker dashboard composite, add-skill POST body capture
 * with success and duplicate-400 toasts, and the overview save PATCH that
 * also refreshes the session user's cached name.
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
import SeekerProfilePage from '../profile'

const { refreshUser } = vi.hoisted(() => ({ refreshUser: vi.fn() }))

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'seeker-1', type: 'job_seeker', name: 'Ava Reyes', email: 'ava@example.com' },
    isLoading: false,
    isSeeker: true,
    isCompany: false,
    refreshUser,
  }),
}))

function renderProfile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/seeker/profile']}>
          <SeekerProfilePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('SeekerProfilePage', () => {
  beforeEach(() => {
    setAccessToken(ACCESS_TOKEN)
    refreshUser.mockClear()
  })
  afterEach(() => localStorage.clear())

  it('shows the header name and goals from the real profile', async () => {
    renderProfile()
    expect(await screen.findByRole('heading', { name: 'Ava Reyes' })).toBeInTheDocument()
    expect(screen.getByText('Ship ML systems.', { selector: 'p' })).toBeInTheDocument()
  })

  it('lists education with the formatted date range', async () => {
    const user = userEvent.setup()
    renderProfile()
    await user.click(await screen.findByRole('tab', { name: 'Education' }))
    expect(await screen.findByText('TU Berlin')).toBeInTheDocument()
    expect(screen.getByText(/Sep 2019 – Jul 2021/)).toBeInTheDocument()
  })

  it('lists skills with their level', async () => {
    const user = userEvent.setup()
    renderProfile()
    await user.click(await screen.findByRole('tab', { name: 'Skills' }))
    expect(await screen.findByText('Python')).toBeInTheDocument()
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('adds a skill, posting {skill_name, skill_level} and toasting', async () => {
    const user = userEvent.setup()
    const posts: Array<{ skill_name: string; skill_level: string }> = []
    server.use(
      http.post('*/api/v1/seekers/seeker-skills/', async ({ request }) => {
        posts.push((await request.json()) as { skill_name: string; skill_level: string })
        return HttpResponse.json(
          { id: 'new-skill-id', skill_set: 'set-id', skill_level: 'Intermediate' },
          { status: 201 },
        )
      }),
    )
    renderProfile()

    await user.click(await screen.findByRole('tab', { name: 'Skills' }))
    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    await user.type(await screen.findByRole('textbox', { name: /^Skill/ }), 'Rust')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Skill added')).toBeInTheDocument()
    expect(posts).toEqual([{ skill_name: 'Rust', skill_level: 'Intermediate' }])
  })

  it('surfaces a duplicate-skill 400 as a toast', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/seekers/seeker-skills/', () =>
        HttpResponse.json({ error: 'This skill has already been added.' }, { status: 400 }),
      ),
    )
    renderProfile()

    await user.click(await screen.findByRole('tab', { name: 'Skills' }))
    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    await user.type(await screen.findByRole('textbox', { name: /^Skill/ }), 'Python')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('This skill has already been added.')).toBeInTheDocument()
  })

  it('saves the overview, PATCHing the seeker profile and refreshing the session user', async () => {
    const user = userEvent.setup()
    const patches: unknown[] = []
    server.use(
      http.patch('*/api/v1/seekers/profiles/:id/', async ({ request }) => {
        patches.push(await request.json())
        return HttpResponse.json({})
      }),
    )
    renderProfile()

    await screen.findByRole('heading', { name: 'Ava Reyes' })
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Profile updated')).toBeInTheDocument()
    expect(patches).toHaveLength(1)
    expect(refreshUser).toHaveBeenCalledTimes(1)
  })
})
