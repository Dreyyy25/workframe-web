/**
 * Mutable, in-memory session store. Cloned from the immutable seed in `data.ts`
 * so screens can "write" (apply to a job, withdraw, change applicant status,
 * edit profile, post a job) and have it persist for the browser session.
 * Resets on full reload — acceptable while there is no real backend.
 */

import {
  APPLICANTS,
  APPLICATIONS,
  COMPANIES,
  COMPANY_ACCOUNT_ID,
  JOBS,
  SEEKER,
} from './data'
import type { Applicant, Application, Company, Job, SeekerProfile } from './types'

interface Db {
  companies: Company[]
  jobs: Job[]
  seeker: SeekerProfile
  applications: Application[]
  applicants: Applicant[]
  companyAccountId: string
}

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T)

function freshDb(): Db {
  return {
    companies: clone(COMPANIES),
    jobs: clone(JOBS),
    seeker: clone(SEEKER),
    applications: clone(APPLICATIONS),
    applicants: clone(APPLICANTS),
    companyAccountId: COMPANY_ACCOUNT_ID,
  }
}

export const db: Db = freshDb()

/** Restore the store to its seeded state (used by tests / a future "reset demo"). */
export function resetStore() {
  Object.assign(db, freshDb())
}

let counter = 0
/** Stable-ish unique id for newly created records this session. */
export function genId(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${counter}_${(counter * 2654435761) % 100000}`
}
