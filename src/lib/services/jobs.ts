/**
 * Real jobs services behind the public browse screens. Adapts the staging
 * API's nested read DTOs to the screen view models and translates the
 * name-based JobFilters into UUID/ordering query params.
 */
import { ApiError } from '@/lib/api/client'
import { getJobPost, getJobPosts } from '@/lib/api/public'
import type { JobPost } from '@/lib/api/types'
import { normalizeSalary } from './adapter-utils'
import { resolveJobTypeId, resolveStreamId } from './meta'
import type { JobFilters, JobWithCompany } from './types'

export { normalizeSalary }

export function adaptJob(dto: JobPost): JobWithCompany {
  const salary = normalizeSalary(dto.salary_min, dto.salary_max, dto.salary_type)
  return {
    id: dto.id,
    companyId: dto.company.id,
    title: dto.job_title,
    type: dto.job_type.job_type_name,
    city: dto.job_location.city,
    country: dto.job_location.country,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryType: salary.type,
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

const EMPTY = Object.freeze({ results: [] as JobWithCompany[], count: 0 })

export async function listJobs(
  filters: JobFilters = {},
): Promise<{ results: JobWithCompany[]; count: number }> {
  const { search, type, stream, minSalary, sort = 'newest', page = 1, pageSize = 9 } = filters

  const [job_type, business_stream] = await Promise.all([
    type ? resolveJobTypeId(type) : Promise.resolve(undefined),
    stream ? resolveStreamId(stream) : Promise.resolve(undefined),
  ])
  if (job_type === null || business_stream === null) return EMPTY

  const page_ = await getJobPosts({
    search: search || undefined,
    job_type,
    business_stream,
    salary_floor: minSalary,
    ordering: sort === 'salary' ? '-salary_rank' : '-created_at',
    page,
    page_size: pageSize,
    is_published: true,
    is_active: true,
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
  const page = await getJobPosts({
    company: companyId,
    page_size: 100,
    is_published: true,
    is_active: true,
  })
  return page.results.map(adaptJob)
}
