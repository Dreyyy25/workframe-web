export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type SalaryType = 'hourly' | 'monthly' | 'yearly'

/** Mirrors apps/jobs JobPost serializer. FKs are serialized as UUID strings. */
export interface JobPost {
  id: string
  company: string
  job_type: string
  job_location: string
  job_title: string
  job_description: string
  salary_min: number | null
  salary_max: number | null
  salary_type: SalaryType | null
  deadline_date: string | null
  is_published: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface JobType {
  id: string
  job_type_name: string
  description: string | null
}

export interface JobLocation {
  id: string
  street_address: string | null
  city: string
  country: string
  zip: string | null
  country_code: string | null
}

export interface BusinessStream {
  id: string
  business_stream_name: string
}

// ---------------------------------------------------------------------------
// Auth / accounts (mirrors apps/accounts on the backend staging branch).
// The refresh token never appears in any response body — it lives in an
// httpOnly cookie the browser attaches automatically.
// ---------------------------------------------------------------------------

/** Same union as the backend's UserAccount.user_type (and mock UserType). */
export type ApiUserType = 'job_seeker' | 'company'

/** Compact user payload returned by login/register. */
export interface AuthUser {
  id: string
  email: string
  user_type: ApiUserType
}

/** Full account payload from GET /accounts/me/ (UserAccountSerializer). */
export interface UserAccount {
  id: string
  email: string
  user_type: ApiUserType
  date_of_birth: string | null
  contact_number: string
  sex: string
  user_image_url: string
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

/** Mirrors apps/seekers SeekerProfile serializer; PK is the user's UUID. */
export interface SeekerProfile {
  user_account: string
  first_name: string
  last_name: string
  contact_details: string
  goals: string
  resume_url: string
  created_at: string
  updated_at: string
}

/** Mirrors apps/companies Company serializer. Note: has its own UUID `id`. */
export interface CompanyProfile {
  id: string
  user_account: string
  company_name: string
  business_stream: string
  profile_description: string
  company_website_url: string
  contact_email: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
}

export interface CompanyImage {
  id: string
  company: string
  image_url: string
  created_at: string
}

/** GET /companies/dashboard/{userId}/ */
export interface CompanyDashboard {
  company: CompanyProfile
  images: CompanyImage[]
}

export interface LoginResponse {
  message: string
  user: AuthUser
  tokens: { access: string }
}

export interface RegisterResponse extends LoginResponse {
  /** Signal-created blank profile; shape depends on user_type. */
  profile: SeekerProfile | CompanyProfile | null
}

export interface RefreshResponse {
  access: string
}

export interface RegisterInput {
  email: string
  password: string
  user_type: ApiUserType
}
