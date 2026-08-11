/** Company console transport: dashboard, profile writes, images. */
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { CompanyDashboard, CompanyImage, CompanyProfile } from './types'

export function getCompanyDashboard(userId: string) {
  return apiGet<CompanyDashboard>(`/companies/dashboard/${userId}/`)
}

export function patchCompanyProfile(companyId: string, body: Record<string, unknown>) {
  return apiPatch<CompanyProfile>(`/companies/profile/${companyId}/`, { body })
}

export function postCompanyImage(body: { image_url: string }) {
  return apiPost<CompanyImage>('/companies/company-images/', { body })
}

export function deleteCompanyImage(imageId: string) {
  return apiDelete<void>(`/companies/company-images/${imageId}/`)
}
