/**
 * Shared fixture data for MSW handlers and tests. Shapes mirror the real
 * backend responses on the staging branch of Job-Board-API-only (verified
 * against apps/accounts/views.py, seekers/companies serializers).
 */
import type { CompanyDashboard, SeekerProfile, UserAccount } from '@/lib/api/types'

export const SEEKER_ID = '11111111-1111-4111-8111-111111111111'
export const COMPANY_USER_ID = '22222222-2222-4222-8222-222222222222'
export const COMPANY_PROFILE_ID = '33333333-3333-4333-8333-333333333333'
export const STREAM_ID = '44444444-4444-4444-8444-444444444444'

export const ACCESS_TOKEN = 'test-access-token'
export const ROTATED_ACCESS_TOKEN = 'test-access-token-rotated'

export const seekerAuthUser = {
  id: SEEKER_ID,
  email: 'ava@example.com',
  user_type: 'job_seeker' as const,
}

export const companyAuthUser = {
  id: COMPANY_USER_ID,
  email: 'team@northwind.dev',
  user_type: 'company' as const,
}

export function seekerAccount(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    id: SEEKER_ID,
    email: 'ava@example.com',
    user_type: 'job_seeker',
    date_of_birth: null,
    contact_number: '',
    sex: '',
    user_image_url: '',
    is_active: true,
    last_login: '2026-08-01T10:00:00Z',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function seekerProfile(overrides: Partial<SeekerProfile> = {}): SeekerProfile {
  return {
    user_account: SEEKER_ID,
    first_name: 'Ava',
    last_name: 'Reyes',
    contact_details: '',
    goals: '',
    resume_url: '',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function companyDashboard(overrides: Partial<CompanyDashboard> = {}): CompanyDashboard {
  return {
    company: {
      id: COMPANY_PROFILE_ID,
      user_account: COMPANY_USER_ID,
      company_name: 'Northwind Labs',
      business_stream: STREAM_ID,
      profile_description: '',
      company_website_url: '',
      contact_email: '',
      status: 'active',
      created_at: '2026-07-01T10:00:00Z',
      updated_at: '2026-08-01T10:00:00Z',
    },
    images: [],
    ...overrides,
  }
}
