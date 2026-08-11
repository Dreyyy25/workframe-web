import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth/auth-context'
import type { UserType } from '@/lib/services/types'

/**
 * Route guard. Redirects guests to /login (remembering where they came from).
 * When `role` is set, a signed-in user of the wrong role is sent to their home.
 * While the session bootstrap (silent refresh) is in flight we render a quiet
 * splash instead of deciding — otherwise a logged-in user reloading a
 * protected route would bounce to /login before the cookie check finishes.
 */
export function RequireAuth({ role }: { role?: UserType }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        className="flex min-h-[50vh] items-center justify-center"
        role="status"
        aria-label="Checking your session"
      >
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (role && user.type !== role) {
    return <Navigate to={user.type === 'company' ? '/company/dashboard' : '/seeker/dashboard'} replace />
  }
  return <Outlet />
}
