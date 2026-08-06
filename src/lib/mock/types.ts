/**
 * Domain types for the Workframe app.
 *
 * The backend (Django Job Board API) is not implemented yet, so the whole app
 * runs on an in-memory mock layer (see `data.ts` / `store.ts` / `services.ts`).
 * These shapes are intentionally denormalized + friendly to build screens
 * against; when a real API lands we adapt the service layer, not the screens.
 */

export type {
  Company,
  CompanyStatus,
  Job,
  JobSkill,
  SalaryType,
  SkillLevel,
} from '../services/types'

import type { SkillLevel } from '../services/types'

export type UserType = 'job_seeker' | 'company'
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
