import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { EducationDto, ExperienceDto, SeekerDashboard, SeekerProfile, SeekerSkillReadDto } from './types'

export function getSeekerDashboard(userId: string) {
  return apiGet<SeekerDashboard>(`/seekers/dashboard/${userId}/`)
}

export function patchSeekerProfile(userId: string, body: Partial<SeekerProfile>) {
  return apiPatch<SeekerProfile>(`/seekers/profiles/${userId}/`, { body })
}

export function createEducation(body: Partial<EducationDto>) {
  return apiPost<EducationDto>('/seekers/education/', { body })
}

export function deleteEducation(id: string) {
  return apiDelete<void>(`/seekers/education/${id}/`)
}

export function createExperience(body: Partial<ExperienceDto>) {
  return apiPost<ExperienceDto>('/seekers/experience/', { body })
}

export function deleteExperience(id: string) {
  return apiDelete<void>(`/seekers/experience/${id}/`)
}

export function createSeekerSkill(body: { skill_name: string; skill_level: string }) {
  return apiPost<{ id: string; skill_set: string; skill_level: string }>('/seekers/seeker-skills/', { body })
}

export function deleteSeekerSkill(id: string) {
  return apiDelete<void>(`/seekers/seeker-skills/${id}/`)
}
