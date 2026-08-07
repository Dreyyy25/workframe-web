export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type SalaryType = 'hourly' | 'monthly' | 'yearly'

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

export interface JobTypeRef {
  id: string
  job_type_name: string
}

export interface JobPostCompanyRef {
  id: string // Company id (NOT the owning user-account id)
  company_name: string
  business_stream: BusinessStream
}

export interface RequiredSkill {
  id: string
  skill_set: { id: string; skill_name: string }
  skill_level: SkillLevel
  is_required: boolean
}

/** Mirrors the staging JobPostReadSerializer (list + retrieve, nested). */
export interface JobPost {
  id: string
  company: JobPostCompanyRef
  job_type: JobTypeRef
  job_location: JobLocation
  required_skills: RequiredSkill[]
  job_title: string
  job_description: string
  /** Decimal serialized as string, e.g. "120000.00". */
  salary_min: string | null
  salary_max: string | null
  /** "" when unset — never null. */
  salary_type: SalaryType | ''
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

export interface PublicCompanyImage {
  id: string
  image_url: string
  created_at: string
}

/** GET /companies/public/ list item. contact_email/user_account are excluded server-side. */
export interface PublicCompany {
  id: string
  company_name: string
  business_stream: BusinessStream
  profile_description: string
  company_website_url: string
  status: 'active'
  open_roles_count: number
}

/** GET /companies/public/{id}/ — list shape plus images. */
export interface PublicCompanyDetail extends PublicCompany {
  images: PublicCompanyImage[]
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

export interface EducationDto {
  id: string
  user_account: string
  institute_university_name: string
  degree_type: string
  field_of_study: string
  academic_details: string
  /** decimal string or null */
  percentage: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface ExperienceDto {
  id: string
  user_account: string
  company_name: string
  position: string
  description: string
  job_location_city: string
  job_location_country: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface SeekerSkillReadDto {
  id: string
  user_account: string
  skill_set: { id: string; skill_name: string; created_at: string }
  skill_level: SkillLevel
}

/** GET /seekers/dashboard/{userId}/ */
export interface SeekerDashboard {
  profile: SeekerProfile
  education: EducationDto[]
  experience: ExperienceDto[]
  skills: SeekerSkillReadDto[]
}

export interface ApplicationJobPostDto {
  id: string
  job_title: string
  company: { id: string; company_name: string }
  job_type: { id: string; job_type_name: string }
  job_location: { city: string; country: string }
  salary_min: string | null
  salary_max: string | null
  salary_type: SalaryType | ''
  deadline_date: string | null
  is_published: boolean
  is_active: boolean
}

export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'

export interface ApplicationReadDto {
  id: string
  user_account: string
  job_post: ApplicationJobPostDto
  application_date: string
  application_status: ApplicationStatus
  cover_letter: string
  updated_at: string
}

export interface ApplyResponse {
  message: string
  data: { id: string; application_status: ApplicationStatus; application_date: string }
}
