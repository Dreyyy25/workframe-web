/**
 * Domain types for the Workframe app.
 *
 * The backend (Django Job Board API) is not implemented yet, so the whole app
 * runs on an in-memory mock layer (see `data.ts` / `store.ts` / `services.ts`).
 * These shapes are intentionally denormalized + friendly to build screens
 * against; when a real API lands we adapt the service layer, not the screens.
 */

export type {
  Application,
  AppStatus,
  Company,
  CompanyStatus,
  DegreeType,
  Education,
  Experience,
  Job,
  JobSkill,
  SalaryType,
  SeekerProfile,
  SeekerSkill,
  Sex,
  SkillLevel,
} from '../services/types'

import type { AppStatus } from '../services/types'

export type UserType = 'job_seeker' | 'company'

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
