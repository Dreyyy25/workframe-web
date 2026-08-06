/**
 * Real jobs services behind the public browse screens. Adapts the staging
 * API's nested read DTOs to the screen view models and translates the
 * name-based JobFilters into UUID/ordering query params.
 */
import { ApiError } from '@/lib/api/client'
import { getJobPost, getJobPosts } from '@/lib/api/public'
import type { JobPost } from '@/lib/api/types'
import { resolveJobTypeId, resolveStreamId } from './meta'
import type { JobFilters, JobWithCompany } from './types'

const num = (v: string | null): number | null => (v == null ? null : Number(v))

export function adaptJob(dto: JobPost): JobWithCompany {
  return {
    id: dto.id,
    companyId: dto.company.id,
    title: dto.job_title,
    type: dto.job_type.job_type_name,
    city: dto.job_location.city,
    country: dto.job_location.country,
    salaryMin: num(dto.salary_min),
    salaryMax: num(dto.salary_max),
    salaryType: dto.salary_type || null,
    deadline: dto.deadline_date,
    posted: dto.created_at.slice(0, 10),
    published: dto.is_published,
    skills: dto.required_skills.map((s) => ({
      name: s.skill_set.skill_name,
      level: s.skill_level,
      required: s.is_required,
    })),
    description: dto.job_description,
    company: { id: dto.company.id, name: dto.company.company_name },
  }
}

const EMPTY = { results: [] as JobWithCompany[], count: 0 }

export async function listJobs(
  filters: JobFilters = {},
): Promise<{ results: JobWithCompany[]; count: number }> {
  const { search, type, stream, minSalary, sort = 'newest', page = 1, pageSize = 9 } = filters

  const job_type = type ? await resolveJobTypeId(type) : undefined
  if (job_type === null) return EMPTY
  const business_stream = stream ? await resolveStreamId(stream) : undefined
  if (business_stream === null) return EMPTY

  const page_ = await getJobPosts({
    search: search || undefined,
    job_type,
    business_stream,
    salary_floor: minSalary,
    ordering: sort === 'salary' ? '-salary_rank' : '-created_at',
    page,
    page_size: pageSize,
  })
  return { results: page_.results.map(adaptJob), count: page_.count }
}

export async function getJob(id: string): Promise<JobWithCompany | null> {
  try {
    return adaptJob(await getJobPost(id))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function listCompanyRoles(companyId: string): Promise<JobWithCompany[]> {
  const page = await getJobPosts({ company: companyId, page_size: 100 })
  return page.results.map(adaptJob)
}
