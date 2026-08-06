/**
 * Async service layer over the in-memory store. Every function returns a
 * Promise (with a tiny simulated latency) so screens can use TanStack Query
 * exactly as they would against a real API. When the Django backend is built,
 * swap these bodies for `fetch` calls and the screens keep working.
 */

import { BUSINESS_STREAMS, JOB_TYPES } from './data'
import { db, genId } from './store'
import type {
  Applicant,
  Application,
  AppStatus,
  Company,
  CompanyStatus,
  Education,
  Experience,
  Job,
  SeekerProfile,
  SeekerSkill,
  Sex,
  SkillLevel,
} from './types'
import type { JobFilters, JobWithCompany } from '../services/types'

export type { JobFilters, JobWithCompany } from '../services/types'

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms))

/* ----------------------------- joined shapes ----------------------------- */

export interface CompanyWithRoles extends Company {
  openRoles: Job[]
}
export interface ApplicationWithJob extends Application {
  job: JobWithCompany | null
}
export interface ApplicantWithJob extends Applicant {
  job: Job | null
}
export interface CompanyJobRow extends Job {
  applicantCount: number
}

/* -------------------------------- helpers -------------------------------- */

const company = (id: string) => db.companies.find((c) => c.id === id) ?? null
const join = (j: Job): JobWithCompany => ({ ...j, company: company(j.companyId) as Company })

/* -------------------------------- meta ----------------------------------- */

export async function listStreams(): Promise<string[]> {
  await delay(120)
  return [...BUSINESS_STREAMS]
}

export async function listJobTypes(): Promise<string[]> {
  await delay(120)
  return [...JOB_TYPES]
}

/* -------------------------------- jobs ----------------------------------- */

export async function listJobs(filters: JobFilters = {}): Promise<{ results: JobWithCompany[]; count: number }> {
  await delay()
  const { search, type, stream, minSalary, sort = 'newest', page = 1, pageSize = 9 } = filters
  let rows = db.jobs.filter((j) => j.published)

  if (search) {
    const q = search.toLowerCase()
    rows = rows.filter((j) => {
      const c = company(j.companyId)
      return (
        j.title.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        (c?.name.toLowerCase().includes(q) ?? false) ||
        j.skills.some((s) => s.name.toLowerCase().includes(q))
      )
    })
  }
  if (type) rows = rows.filter((j) => j.type === type)
  if (stream) rows = rows.filter((j) => company(j.companyId)?.stream === stream)
  if (minSalary != null) rows = rows.filter((j) => (j.salaryMax ?? j.salaryMin ?? 0) >= minSalary)

  rows = [...rows].sort((a, b) =>
    sort === 'salary'
      ? (b.salaryMax ?? 0) - (a.salaryMax ?? 0)
      : b.posted.localeCompare(a.posted),
  )

  const count = rows.length
  const start = (page - 1) * pageSize
  return { results: rows.slice(start, start + pageSize).map(join), count }
}

export async function getJob(id: string): Promise<JobWithCompany | null> {
  await delay()
  const job = db.jobs.find((j) => j.id === id)
  return job ? join(job) : null
}

/* ------------------------------ companies -------------------------------- */

export async function listCompanies(filters: { search?: string; stream?: string } = {}): Promise<
  CompanyWithRoles[]
> {
  await delay()
  let rows = [...db.companies]
  if (filters.search) {
    const q = filters.search.toLowerCase()
    rows = rows.filter(
      (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
    )
  }
  if (filters.stream) rows = rows.filter((c) => c.stream === filters.stream)
  return rows.map((c) => ({
    ...c,
    openRoles: db.jobs.filter((j) => j.companyId === c.id && j.published),
  }))
}

export async function getCompany(id: string): Promise<CompanyWithRoles | null> {
  await delay()
  const c = company(id)
  if (!c) return null
  return { ...c, openRoles: db.jobs.filter((j) => j.companyId === c.id && j.published) }
}

/* ------------------------------- seeker ---------------------------------- */

export async function getSeekerProfile(): Promise<SeekerProfile> {
  await delay()
  return db.seeker
}

export async function updateSeekerProfile(patch: Partial<SeekerProfile>): Promise<SeekerProfile> {
  await delay(320)
  Object.assign(db.seeker, patch)
  return db.seeker
}

export async function addEducation(input: Omit<Education, 'id'>): Promise<Education> {
  await delay(280)
  const row: Education = { ...input, id: genId('edu') }
  db.seeker.education.push(row)
  return row
}
export async function deleteEducation(id: string): Promise<void> {
  await delay(220)
  db.seeker.education = db.seeker.education.filter((e) => e.id !== id)
}
export async function addExperience(input: Omit<Experience, 'id'>): Promise<Experience> {
  await delay(280)
  const row: Experience = { ...input, id: genId('exp') }
  db.seeker.experience.push(row)
  return row
}
export async function deleteExperience(id: string): Promise<void> {
  await delay(220)
  db.seeker.experience = db.seeker.experience.filter((e) => e.id !== id)
}
export async function addSkill(input: { name: string; level: SkillLevel }): Promise<SeekerSkill> {
  await delay(220)
  const row: SeekerSkill = { ...input, id: genId('skill') }
  db.seeker.skills.push(row)
  return row
}
export async function deleteSkill(id: string): Promise<void> {
  await delay(180)
  db.seeker.skills = db.seeker.skills.filter((s) => s.id !== id)
}

/* ----------------------------- applications ------------------------------ */

export async function listApplications(): Promise<ApplicationWithJob[]> {
  await delay()
  return db.applications.map((a) => {
    const job = db.jobs.find((j) => j.id === a.jobId)
    return { ...a, job: job ? join(job) : null }
  })
}

export async function getApplication(id: string): Promise<ApplicationWithJob | null> {
  await delay()
  const a = db.applications.find((x) => x.id === id)
  if (!a) return null
  const job = db.jobs.find((j) => j.id === a.jobId)
  return { ...a, job: job ? join(job) : null }
}

export async function applyToJob(jobId: string, cover: string): Promise<Application> {
  await delay(360)
  const existing = db.applications.find((a) => a.jobId === jobId)
  if (existing) return existing
  const row: Application = {
    id: genId('app'),
    jobId,
    status: 'pending',
    applied: new Date().toISOString().slice(0, 10),
    cover,
  }
  db.applications.unshift(row)
  return row
}

export async function hasApplied(jobId: string): Promise<boolean> {
  await delay(80)
  return db.applications.some((a) => a.jobId === jobId)
}

export async function withdrawApplication(id: string): Promise<Application | null> {
  await delay(300)
  const a = db.applications.find((x) => x.id === id)
  if (a) a.status = 'withdrawn'
  return a ?? null
}

/* ------------------------------- company --------------------------------- */

export async function getCompanyStats(): Promise<{
  activePosts: number
  totalApplicants: number
  newThisWeek: number
}> {
  await delay()
  const mine = db.jobs.filter((j) => j.companyId === db.companyAccountId)
  const myJobIds = new Set(mine.map((j) => j.id))
  const applicants = db.applicants.filter((a) => myJobIds.has(a.jobId))
  const weekAgo = '2026-06-03'
  return {
    activePosts: mine.filter((j) => j.published).length,
    totalApplicants: applicants.length,
    newThisWeek: applicants.filter((a) => a.applied >= weekAgo).length,
  }
}

export async function listCompanyJobs(): Promise<CompanyJobRow[]> {
  await delay()
  return db.jobs
    .filter((j) => j.companyId === db.companyAccountId)
    .map((j) => ({
      ...j,
      applicantCount: db.applicants.filter((a) => a.jobId === j.id).length,
    }))
}

export async function getCompanyJob(id: string): Promise<Job | null> {
  await delay()
  return db.jobs.find((j) => j.id === id && j.companyId === db.companyAccountId) ?? null
}

export type JobInput = Omit<Job, 'id' | 'companyId' | 'posted'>

export async function createJob(input: JobInput): Promise<Job> {
  await delay(360)
  const row: Job = {
    ...input,
    id: genId('job'),
    companyId: db.companyAccountId,
    posted: new Date().toISOString().slice(0, 10),
  }
  db.jobs.unshift(row)
  return row
}

export async function updateJob(id: string, input: JobInput): Promise<Job | null> {
  await delay(360)
  const job = db.jobs.find((j) => j.id === id)
  if (!job) return null
  Object.assign(job, input)
  return job
}

export async function deleteJob(id: string): Promise<void> {
  await delay(300)
  db.jobs = db.jobs.filter((j) => j.id !== id)
}

export async function toggleJobPublished(id: string): Promise<Job | null> {
  await delay(220)
  const job = db.jobs.find((j) => j.id === id)
  if (job) job.published = !job.published
  return job ?? null
}

/* ------------------------------ applicants ------------------------------- */

export async function listApplicants(jobId?: string): Promise<ApplicantWithJob[]> {
  await delay()
  const myJobIds = new Set(
    db.jobs.filter((j) => j.companyId === db.companyAccountId).map((j) => j.id),
  )
  return db.applicants
    .filter((a) => myJobIds.has(a.jobId) && (!jobId || a.jobId === jobId))
    .map((a) => ({ ...a, job: db.jobs.find((j) => j.id === a.jobId) ?? null }))
}

export async function getApplicant(id: string): Promise<ApplicantWithJob | null> {
  await delay()
  const a = db.applicants.find((x) => x.id === id)
  if (!a) return null
  return { ...a, job: db.jobs.find((j) => j.id === a.jobId) ?? null }
}

export async function setApplicantStatus(id: string, status: AppStatus): Promise<Applicant | null> {
  await delay(280)
  const a = db.applicants.find((x) => x.id === id)
  if (a) a.status = status
  return a ?? null
}

/* -------------------------- company profile ------------------------------ */

export async function getCompanyProfile(): Promise<Company> {
  await delay()
  return db.companies.find((c) => c.id === db.companyAccountId) as Company
}

export async function updateCompanyProfile(patch: Partial<Company>): Promise<Company> {
  await delay(320)
  const c = db.companies.find((x) => x.id === db.companyAccountId) as Company
  Object.assign(c, patch)
  return c
}

export async function addCompanyImage(url: string): Promise<Company> {
  await delay(220)
  const c = db.companies.find((x) => x.id === db.companyAccountId) as Company
  c.images = [...c.images, url]
  return c
}

export async function removeCompanyImage(url: string): Promise<Company> {
  await delay(200)
  const c = db.companies.find((x) => x.id === db.companyAccountId) as Company
  c.images = c.images.filter((i) => i !== url)
  return c
}

/* re-exports for convenience */
export type { CompanyStatus, Sex }
