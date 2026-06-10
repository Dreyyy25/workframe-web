import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth/auth-context'
import type { UserType } from '@/lib/mock/types'

/**
 * Route guard. Redirects guests to /login (remembering where they came from).
 * When `role` is set, a signed-in user of the wrong role is sent to their home.
 */
export function RequireAuth({ role }: { role?: UserType }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (role && user.type !== role) {
    return <Navigate to={user.type === 'company' ? '/company/dashboard' : '/seeker/dashboard'} replace />
  }
  return <Outlet />
}
