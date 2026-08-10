/**
 * Session user model + profile-derived display name.
 *
 * UserAccount has no name field — it lives on the role profile. The name
 * lookup must never block a login, so any failure (or a blank profile right
 * after registration) falls back to the email.
 */
import { apiGet } from '@/lib/api/client'
import { getCompanyDashboard } from '@/lib/api/companies'
import type { AuthUser, SeekerProfile } from '@/lib/api/types'
import type { UserType } from '@/lib/mock/types'

export interface SessionUser {
  id: string
  type: UserType
  name: string
  email: string
}

async function fetchDisplayName(user: AuthUser): Promise<string> {
  if (user.user_type === 'job_seeker') {
    const profile = await apiGet<SeekerProfile>(`/seekers/profiles/${user.id}/`)
    return `${profile.first_name} ${profile.last_name}`.trim()
  }
  const dashboard = await getCompanyDashboard(user.id)
  return dashboard.company.company_name.trim()
}

export async function buildSessionUser(user: AuthUser): Promise<SessionUser> {
  let name = ''
  try {
    name = await fetchDisplayName(user)
  } catch {
    name = ''
  }
  return {
    id: user.id,
    type: user.user_type,
    name: name || user.email,
    email: user.email,
  }
}
