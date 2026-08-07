/** Real application services for the signed-in seeker. */
import { ApiError } from '@/lib/api/client'
import { getMe } from '@/lib/api/auth'
import {
  getApplicationById, getApplications, patchApplicationStatus, postApply,
} from '@/lib/api/applications'
import type { ApplicationJobPostDto, ApplicationReadDto } from '@/lib/api/types'
import type { Application, ApplicationJob, ApplicationWithJob } from './types'

const num = (v: string | null): number | null => (v == null ? null : Number(v))

function adaptJobSummary(dto: ApplicationJobPostDto): ApplicationJob {
  return {
    id: dto.id,
    title: dto.job_title,
    type: dto.job_type.job_type_name,
    city: dto.job_location.city,
    country: dto.job_location.country,
    salaryMin: num(dto.salary_min),
    salaryMax: num(dto.salary_max),
    salaryType: dto.salary_type || null,
    companyId: dto.company.id,
    company: { id: dto.company.id, name: dto.company.company_name },
    published: dto.is_published,
  }
}

function adaptApplication(dto: ApplicationReadDto): ApplicationWithJob {
  return {
    id: dto.id,
    jobId: dto.job_post.id,
    status: dto.application_status,
    applied: dto.application_date.slice(0, 10),
    cover: dto.cover_letter,
    job: adaptJobSummary(dto.job_post),
  }
}

export async function listApplications(): Promise<ApplicationWithJob[]> {
  const page = await getApplications()
  return page.results.map(adaptApplication)
}

export async function getApplication(id: string): Promise<ApplicationWithJob | null> {
  try {
    return adaptApplication(await getApplicationById(id))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function applyToJob(jobId: string, cover: string): Promise<Application> {
  const me = await getMe()
  const res = await postApply({ user_account: me.id, job_post: jobId, cover_letter: cover })
  return {
    id: res.data.id,
    jobId,
    status: res.data.application_status,
    applied: res.data.application_date.slice(0, 10),
    cover,
  }
}

export async function withdrawApplication(id: string): Promise<void> {
  await patchApplicationStatus(id, 'withdrawn')
}
