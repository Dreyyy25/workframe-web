/**
 * Public-domain view models — the single source of truth consumed by the
 * browse screens and the rest of the services layer.
 *
 * Deliberate deltas from the original mock shapes (see spec §4.2):
 *  - `Job.deadline` and `Job.salaryType` are nullable (backend allows both).
 *  - `JobWithCompany.company` is a light ref — screens only use id + name.
 */

export type SalaryType = 'hourly' | 'monthly' | 'yearly'
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
export type CompanyStatus = 'active' | 'inactive' | 'suspended'
export type UserType = 'job_seeker' | 'company'

export interface JobSkill {
  name: string
  level: SkillLevel
  required: boolean
}

export interface Job {
  id: string
  companyId: string
  title: string
  type: string
  city: string
  country: string
  salaryMin: number | null
  salaryMax: number | null
  salaryType: SalaryType | null
  /** YYYY-MM-DD; null when the posting has no deadline. */
  deadline: string | null
  /** YYYY-MM-DD */
  posted: string
  published: boolean
  skills: JobSkill[]
  description: string
}

export interface CompanyRef {
  id: string
  name: string
}

export interface JobWithCompany extends Job {
  company: CompanyRef
}

export interface Company {
  id: string
  name: string
  stream: string
  /** Bare domain (protocol stripped) — screens render `https://${website}`. */
  website: string
  status: CompanyStatus
  description: string
  images: string[]
  /** Short initials shown in the logo tile, e.g. "NL". */
  logo: string
}

export interface CompanyListItem extends Company {
  openRolesCount: number
}

export interface JobFilters {
  search?: string
  type?: string
  stream?: string
  minSalary?: number
  sort?: 'newest' | 'salary'
  page?: number
  pageSize?: number
}

export type AppStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'
export type DegreeType =
  | 'High School'
  | 'Associate'
  | 'Bachelor'
  | 'Master'
  | 'PhD'
  | 'Certificate'
  | 'Diploma'
export type Sex = 'M' | 'F' | 'Other'

export interface Education {
  id: string
  school: string
  degree: DegreeType
  field: string
  /** YYYY-MM */
  start: string
  /** YYYY-MM, blank = ongoing */
  end: string
  percentage: number | null
}

export interface Experience {
  id: string
  company: string
  position: string
  city: string
  country: string
  /** YYYY-MM */
  start: string
  /** YYYY-MM, blank = current */
  end: string
  description: string
}

export interface SeekerSkill {
  id: string
  name: string
  level: SkillLevel
}

export interface SeekerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  contact: string
  goals: string
  resumeUrl: string
  photo: string
  /** YYYY-MM-DD */
  dob: string
  sex: Sex
  education: Education[]
  experience: Experience[]
  skills: SeekerSkill[]
}

/** A job application submitted by the signed-in seeker. */
export interface Application {
  id: string
  jobId: string
  status: AppStatus
  /** YYYY-MM-DD */
  applied: string
  cover: string
}

/** The lean job summary embedded in an application — exactly what the
 * application screens render. The mock's full JobWithCompany satisfies it. */
export interface ApplicationJob {
  id: string
  title: string
  type: string
  city: string
  country: string
  salaryMin: number | null
  salaryMax: number | null
  salaryType: SalaryType | null
  companyId: string
  company: CompanyRef
  published: boolean
}

export interface ApplicationWithJob extends Application {
  job: ApplicationJob | null
  applicant: { id: string; name: string } | null
}

/** The seeker profile joined onto an applicant-detail view — null when the
 * seeker's profile/dashboard 404s (deleted account, defensive fallback). */
export interface ApplicantProfile {
  name: string
  goals: string
  contactDetails: string
  resumeUrl: string
  skills: { name: string; level: string }[]
  education: Education[]
  experience: Experience[]
}

/** Composite for the company applicant-detail screen: the application plus
 * the applying seeker's full profile (or null on the defensive fallback). */
export interface ApplicantDetail {
  application: ApplicationWithJob
  profile: ApplicantProfile | null
  userId: string
}

// ---------------------------------------------------------------------------
// Company console view models (dashboard flatten + profile/image mutations).
// ---------------------------------------------------------------------------

export interface CompanyConsoleImage {
  id: string
  url: string
}

export interface CompanyConsoleStats {
  activePosts: number
  totalApplicants: number
  newThisWeek: number
}

export interface CompanyConsole {
  companyId: string
  name: string
  streamId: string
  streamName: string | null
  status: CompanyStatus
  website: string
  description: string
  images: CompanyConsoleImage[]
  stats: CompanyConsoleStats
}

export interface CompanyProfilePatch {
  name?: string
  streamId?: string
  status?: CompanyStatus
  website?: string
  description?: string
}

// ---------------------------------------------------------------------------
// Company console job views (list/detail adapters + saveJob composite input).
// ---------------------------------------------------------------------------

export interface CompanyJobRow {
  id: string
  title: string
  type: string
  typeId: string
  city: string
  country: string
  salaryMin: number | null
  salaryMax: number | null
  salaryType: SalaryType | null
  deadline: string | null
  published: boolean
  active: boolean
  posted: string
}

export interface CompanyJobSkillRow {
  id: string | null
  name: string
  level: SkillLevel
  required: boolean
}

export interface CompanyJobDetail extends CompanyJobRow {
  description: string
  skillRows: CompanyJobSkillRow[]
}

export interface CompanyJobInput {
  title: string
  description: string
  typeId: string
  city: string
  country: string
  salaryMin: number | null
  salaryMax: number | null
  salaryType: SalaryType | null
  deadline: string | null
  published: boolean
  skills: CompanyJobSkillRow[]
}
