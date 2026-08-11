/**
 * Shared fixture data for MSW handlers and tests. Shapes mirror the real
 * backend responses on the staging branch of Job-Board-API-only (verified
 * against apps/accounts/views.py, seekers/companies serializers).
 */
import type {
  ApplicationReadDto,
  CompanyDashboard,
  CompanyImage,
  EducationDto,
  ExperienceDto,
  JobLocationDto,
  JobPost,
  JobSkillDto,
  PublicCompany,
  PublicCompanyDetail,
  SeekerDashboard,
  SeekerProfile,
  SeekerSkillReadDto,
  UserAccount,
} from '@/lib/api/types'

export const SEEKER_ID = '11111111-1111-4111-8111-111111111111'
export const COMPANY_USER_ID = '22222222-2222-4222-8222-222222222222'
export const COMPANY_PROFILE_ID = '33333333-3333-4333-8333-333333333333'
/** Alias — `companyDashboard().company.id`. */
export const COMPANY_ID = COMPANY_PROFILE_ID
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

export function companyAccount(overrides: Partial<UserAccount> = {}): UserAccount {
  return {
    id: COMPANY_USER_ID,
    email: 'team@northwind.dev',
    user_type: 'company',
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
    images: [companyImageDto()],
    stats: { active_posts: 3, total_applications: 12, new_this_week: 4 },
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

export const EDUCATION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
export const EXPERIENCE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
export const SEEKER_SKILL_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
export const APPLICATION_ID = '12121212-1212-4121-8121-121212121212'

export function educationDto(overrides: Partial<EducationDto> = {}): EducationDto {
  return {
    id: EDUCATION_ID, user_account: SEEKER_ID,
    institute_university_name: 'TU Berlin', degree_type: 'Master',
    field_of_study: 'Computer Science', academic_details: '',
    percentage: '85.00', start_date: '2019-09-01', end_date: '2021-07-01',
    created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function experienceDto(overrides: Partial<ExperienceDto> = {}): ExperienceDto {
  return {
    id: EXPERIENCE_ID, user_account: SEEKER_ID,
    company_name: 'Vertex Data', position: 'ML Engineer',
    description: 'Built pipelines.', job_location_city: 'Berlin',
    job_location_country: 'Germany', start_date: '2021-08-01', end_date: null,
    created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function seekerSkillDto(overrides: Partial<SeekerSkillReadDto> = {}): SeekerSkillReadDto {
  return {
    id: SEEKER_SKILL_ID, user_account: SEEKER_ID,
    skill_set: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', skill_name: 'Python', created_at: '2026-08-01T10:00:00Z' },
    skill_level: 'Advanced',
    ...overrides,
  }
}

export function seekerDashboard(overrides: Partial<SeekerDashboard> = {}): SeekerDashboard {
  return {
    profile: seekerProfile({ first_name: 'Ava', last_name: 'Reyes', goals: 'Ship ML systems.', contact_details: '+49 111', resume_url: 'https://cv.example/ava.pdf' }),
    education: [educationDto()],
    experience: [experienceDto()],
    skills: [seekerSkillDto()],
    ...overrides,
  }
}

export function applicationDto(overrides: Partial<ApplicationReadDto> = {}): ApplicationReadDto {
  return {
    id: APPLICATION_ID, user_account: SEEKER_ID,
    job_post: {
      id: JOB_POST_ID, job_title: 'Machine Learning Engineer',
      company: { id: PUBLIC_COMPANY_ID, company_name: 'Halcyon Systems' },
      job_type: { id: JOB_TYPE_FULLTIME_ID, job_type_name: 'Full-time' },
      job_location: { city: 'Berlin', country: 'Germany' },
      salary_min: '90000.00', salary_max: '120000.00', salary_type: 'yearly',
      deadline_date: '2026-09-01', is_published: true, is_active: true,
    },
    applicant: { id: SEEKER_ID, first_name: 'Avery', last_name: 'Quinn' },
    application_date: '2026-08-05T09:30:00Z', application_status: 'pending',
    cover_letter: 'I love this role.', updated_at: '2026-08-05T09:30:00Z',
    ...overrides,
  }
}

export const COMPANY_IMAGE_ID = '13131313-1313-4313-8313-131313131313'
export const JOB_SKILL_ID = '14141414-1414-4414-8414-141414141414'

export function companyImageDto(overrides: Partial<CompanyImage> = {}): CompanyImage {
  return {
    id: COMPANY_IMAGE_ID,
    company: COMPANY_PROFILE_ID,
    image_url: 'https://img.example/office.jpg',
    created_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function jobLocationDto(overrides: Partial<JobLocationDto> = {}): JobLocationDto {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    street_address: '',
    city: 'Berlin',
    country: 'Germany',
    zip: '',
    country_code: 'DE',
    ...overrides,
  }
}

export function jobSkillDto(overrides: Partial<JobSkillDto> = {}): JobSkillDto {
  return {
    id: JOB_SKILL_ID,
    job_post: JOB_POST_ID,
    skill_set: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    skill_level: 'Advanced',
    is_required: true,
    ...overrides,
  }
}
