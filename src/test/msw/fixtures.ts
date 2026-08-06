/**
 * Shared fixture data for MSW handlers and tests. Shapes mirror the real
 * backend responses on the staging branch of Job-Board-API-only (verified
 * against apps/accounts/views.py, seekers/companies serializers).
 */
import type {
  CompanyDashboard,
  JobPost,
  PublicCompany,
  PublicCompanyDetail,
  SeekerProfile,
  UserAccount,
} from '@/lib/api/types'

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

export const JOB_POST_ID = '55555555-5555-4555-8555-555555555555'
export const PUBLIC_COMPANY_ID = '66666666-6666-4666-8666-666666666666'
export const JOB_TYPE_FULLTIME_ID = '77777777-7777-4777-8777-777777777777'
export const SKILL_ID = '88888888-8888-4888-8888-888888888888'

export const BUSINESS_STREAMS_LIST = [
  { id: STREAM_ID, business_stream_name: 'Data & AI' },
  { id: '44444444-4444-4444-8444-444444444445', business_stream_name: 'Software' },
]

export const JOB_TYPES_LIST = [
  { id: JOB_TYPE_FULLTIME_ID, job_type_name: 'Full-time', description: '' },
  { id: '77777777-7777-4777-8777-777777777778', job_type_name: 'Contract', description: '' },
]

export function jobPost(overrides: Partial<JobPost> = {}): JobPost {
  return {
    id: JOB_POST_ID,
    company: {
      id: PUBLIC_COMPANY_ID,
      company_name: 'Halcyon Systems',
      business_stream: BUSINESS_STREAMS_LIST[0],
    },
    job_type: { id: JOB_TYPE_FULLTIME_ID, job_type_name: 'Full-time' },
    job_location: {
      id: '99999999-9999-4999-8999-999999999999',
      street_address: '',
      city: 'Berlin',
      country: 'Germany',
      zip: '',
      country_code: 'DE',
    },
    required_skills: [
      {
        id: SKILL_ID,
        skill_set: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', skill_name: 'Python' },
        skill_level: 'Advanced',
        is_required: true,
      },
    ],
    job_title: 'Machine Learning Engineer',
    job_description: 'Build models.',
    salary_min: '90000.00',
    salary_max: '120000.00',
    salary_type: 'yearly',
    deadline_date: '2026-09-01',
    is_published: true,
    is_active: true,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function publicCompany(overrides: Partial<PublicCompany> = {}): PublicCompany {
  return {
    id: PUBLIC_COMPANY_ID,
    company_name: 'Halcyon Systems',
    business_stream: BUSINESS_STREAMS_LIST[0],
    profile_description: 'We build data platforms.',
    company_website_url: 'https://halcyon.io',
    status: 'active',
    open_roles_count: 2,
    ...overrides,
  }
}

export function publicCompanyDetail(
  overrides: Partial<PublicCompanyDetail> = {},
): PublicCompanyDetail {
  return {
    ...publicCompany(),
    images: [
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        image_url: 'https://img.example/office.jpg',
        created_at: '2026-08-01T10:00:00Z',
      },
    ],
    ...overrides,
  }
}

export function paginated<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}
