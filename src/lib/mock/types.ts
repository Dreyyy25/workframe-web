/**
 * Domain types for the Workframe app.
 *
 * The backend (Django Job Board API) is not implemented yet, so the whole app
 * runs on an in-memory mock layer (see `data.ts` / `store.ts` / `services.ts`).
 * These shapes are intentionally denormalized + friendly to build screens
 * against; when a real API lands we adapt the service layer, not the screens.
 */

export type UserType = 'job_seeker' | 'company'
export type AppStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'
export type SalaryType = 'hourly' | 'monthly' | 'yearly'
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
export type DegreeType =
  | 'High School'
  | 'Associate'
  | 'Bachelor'
  | 'Master'
  | 'PhD'
  | 'Certificate'
  | 'Diploma'
export type CompanyStatus = 'active' | 'inactive' | 'suspended'
export type Sex = 'M' | 'F' | 'Other'

export interface JobSkill {
  name: string
  level: SkillLevel
  required: boolean
}

export interface Company {
  id: string
  name: string
  stream: string
  website: string
  status: CompanyStatus
  description: string
  images: string[]
  /** Short initials shown in the logo tile, e.g. "NL". */
  logo: string
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
  salaryType: SalaryType
  /** YYYY-MM-DD */
  deadline: string
  /** YYYY-MM-DD */
  posted: string
  published: boolean
  skills: JobSkill[]
  description: string
}

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

/** A candidate who applied to one of the signed-in company's posts. */
export interface Applicant {
  id: string
  jobId: string
  name: string
  /** the candidate's headline / current title */
  title: string
  status: AppStatus
  /** YYYY-MM-DD */
  applied: string
  email: string
  cover: string
  skills: string[]
  experienceYears: number
}
