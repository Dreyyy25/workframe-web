/**
 * Public-domain view models — the single source of truth consumed by the
 * browse screens. `src/lib/mock/` re-imports these so mock data and the
 * real services layer share one set of shapes.
 *
 * Deliberate deltas from the original mock shapes (see spec §4.2):
 *  - `Job.deadline` and `Job.salaryType` are nullable (backend allows both).
 *  - `JobWithCompany.company` is a light ref — screens only use id + name,
 *    and the mock's full Company object still satisfies it structurally.
 */

export type SalaryType = 'hourly' | 'monthly' | 'yearly'
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
export type CompanyStatus = 'active' | 'inactive' | 'suspended'

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
