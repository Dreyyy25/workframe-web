import { apiGet } from './client'
import type {
  BusinessStream,
  JobPost,
  JobType,
  Paginated,
  PublicCompany,
  PublicCompanyDetail,
} from './types'

export interface JobPostQuery {
  search?: string
  job_type?: string
  business_stream?: string
  salary_floor?: number
  company?: string
  ordering?: string
  page?: number
  page_size?: number
}

export function getJobPosts(params?: JobPostQuery) {
  return apiGet<Paginated<JobPost>>('/jobs/job-posts/', { ...params })
}

export function getJobPost(id: string) {
  return apiGet<JobPost>(`/jobs/job-posts/${id}/`)
}

export function getJobTypes() {
  return apiGet<Paginated<JobType>>('/jobs/job-types/', { page_size: 100 })
}

export function getBusinessStreams() {
  return apiGet<Paginated<BusinessStream>>('/companies/business-streams/', { page_size: 100 })
}

export function getPublicCompanies(params?: { search?: string; business_stream?: string }) {
  return apiGet<Paginated<PublicCompany>>('/companies/public/', { ...params, page_size: 100 })
}

export function getPublicCompany(id: string) {
  return apiGet<PublicCompanyDetail>(`/companies/public/${id}/`)
}
