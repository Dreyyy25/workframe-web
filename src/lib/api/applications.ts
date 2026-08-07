import { apiGet, apiPatch, apiPost } from './client'
import type { ApplicationReadDto, ApplicationStatus, ApplyResponse, Paginated } from './types'

export function getApplications() {
  return apiGet<Paginated<ApplicationReadDto>>('/jobs/job-applications/', { page_size: 100 })
}

export function getApplicationById(id: string) {
  return apiGet<ApplicationReadDto>(`/jobs/job-applications/${id}/`)
}

export function postApply(body: { user_account: string; job_post: string; cover_letter: string }) {
  return apiPost<ApplyResponse>('/jobs/apply/', { body })
}

export function patchApplicationStatus(id: string, status: ApplicationStatus) {
  return apiPatch<{ id: string; application_status: ApplicationStatus }>(
    `/jobs/job-applications/${id}/`,
    { body: { application_status: status } },
  )
}
