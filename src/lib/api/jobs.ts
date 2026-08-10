/** Company console transport: job-post CRUD, job locations, job skills. */
import { apiDelete, apiPatch, apiPost } from './client'
import type { JobLocationDto, JobPost, JobPostWriteBody, JobSkillDto } from './types'

export function postJobPost(body: JobPostWriteBody) {
  return apiPost<JobPost>('/jobs/job-posts/', { body })
}

export function patchJobPost(id: string, body: Partial<JobPostWriteBody>) {
  return apiPatch<JobPost>(`/jobs/job-posts/${id}/`, { body })
}

export function deleteJobPost(id: string) {
  return apiDelete<void>(`/jobs/job-posts/${id}/`)
}

export function postJobLocation(body: { city: string; country: string }) {
  return apiPost<JobLocationDto>('/jobs/job-locations/', { body })
}

export function postJobSkill(body: {
  job_post: string
  skill_name?: string
  skill_set?: string
  skill_level: string
  is_required: boolean
}) {
  return apiPost<JobSkillDto>('/jobs/job-skills/', { body })
}

export function patchJobSkill(id: string, body: { skill_level?: string; is_required?: boolean }) {
  return apiPatch<JobSkillDto>(`/jobs/job-skills/${id}/`, { body })
}

export function deleteJobSkill(id: string) {
  return apiDelete<void>(`/jobs/job-skills/${id}/`)
}
