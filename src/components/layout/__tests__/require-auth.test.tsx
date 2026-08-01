/**
 * RequireAuth guard: never bounce during the bootstrap window, redirect
 * guests to /login, redirect wrong-role users home, render the outlet
 * for the right role.
 */
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '../require-auth'
import type { SessionUser } from '@/lib/auth/session'

const mockAuth = vi.hoisted(() => ({
  state: { user: null as SessionUser | null, isLoading: false },
}))

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: mockAuth.state.user,
    isLoading: mockAuth.state.isLoading,
    isSeeker: mockAuth.state.user?.type === 'job_seeker',
    isCompany: mockAuth.state.user?.type === 'company',
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}))

const SEEKER: SessionUser = {
  id: '1',
  type: 'job_seeker',
  name: 'Ava Reyes',
  email: 'ava@example.com',
}

/**
 * One guarded route per render; redirect targets live OUTSIDE the guard so a
 * redirect lands on an unguarded screen (as in the real router, where the
 * other role's home is guarded by a different RequireAuth instance).
 */
function renderAt(guardedPath: string, role?: 'job_seeker' | 'company') {
  const redirectTargets = ['/seeker/dashboard', '/company/dashboard'].filter(
    (p) => p !== guardedPath,
  )
  return render(
    <MemoryRouter initialEntries={[guardedPath]}>
      <Routes>
        <Route element={<RequireAuth role={role} />}>
          <Route path={guardedPath} element={<div>guarded content</div>} />
        </Route>
        <Route path="/login" element={<div>login screen</div>} />
        {redirectTargets.map((p) => (
          <Route key={p} path={p} element={<div>{p} landing</div>} />
        ))}
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  it('renders a splash (not a redirect) while the session bootstrap runs', () => {
    mockAuth.state = { user: null, isLoading: true }
    renderAt('/seeker/dashboard', 'job_seeker')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('login screen')).not.toBeInTheDocument()
    expect(screen.queryByText('guarded content')).not.toBeInTheDocument()
  })

  it('redirects guests to /login once loading has settled', () => {
    mockAuth.state = { user: null, isLoading: false }
    renderAt('/seeker/dashboard', 'job_seeker')
    expect(screen.getByText('login screen')).toBeInTheDocument()
  })

  it('sends a wrong-role user to their own home', () => {
    mockAuth.state = { user: SEEKER, isLoading: false }
    renderAt('/company/dashboard', 'company')
    expect(screen.getByText('/seeker/dashboard landing')).toBeInTheDocument()
    expect(screen.queryByText('guarded content')).not.toBeInTheDocument()
  })

  it('renders the outlet for the right role', () => {
    mockAuth.state = { user: SEEKER, isLoading: false }
    renderAt('/seeker/dashboard', 'job_seeker')
    expect(screen.getByText('guarded content')).toBeInTheDocument()
  })
})
