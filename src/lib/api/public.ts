import { apiGet } from './client'
import type { BusinessStream, JobLocation, JobPost, JobType, Paginated } from './types'

export function getJobPosts(params?: { page_size?: number; ordering?: string; search?: string }) {
  return apiGet<Paginated<JobPost>>('/jobs/job-posts/', {
    page_size: params?.page_size,
    ordering: params?.ordering,
    search: params?.search,
  })
}

export function getJobTypes() {
  return apiGet<Paginated<JobType>>('/jobs/job-types/', { page_size: 100 })
}

export function getJobLocations() {
  return apiGet<Paginated<JobLocation>>('/jobs/job-locations/', { page_size: 100 })
}

export function getBusinessStreams() {
  return apiGet<Paginated<BusinessStream>>('/companies/business-streams/', { page_size: 100 })
}
