/**
 * Real seeker services. The screen's SeekerProfile is a composite: name/goals/
 * contact/resume + education/experience/skills come from the seekers app
 * (dashboard endpoint), while email/dob/sex/photo live on the account
 * (/accounts/me/). updateSeekerProfile fans a flat patch back out to the
 * right endpoint(s).
 */
import { getMe } from '@/lib/api/auth'
import {
  createEducation, createExperience, createSeekerSkill,
  deleteEducation as apiDeleteEducation, deleteExperience as apiDeleteExperience,
  deleteSeekerSkill, getSeekerDashboard, patchSeekerProfile,
} from '@/lib/api/seekers'
import { apiPatch } from '@/lib/api/client'
import type { EducationDto, ExperienceDto, SeekerSkillReadDto, UserAccount } from '@/lib/api/types'
import type { DegreeType, Education, Experience, SeekerProfile, SeekerSkill, Sex, SkillLevel } from './types'

const toApiDate = (month: string): string | null => (month ? `${month}-01` : null)
const toMonth = (date: string | null): string => (date ? date.slice(0, 7) : '')
const toSex = (v: string): Sex => (v === 'M' || v === 'F' ? v : 'Other')

function adaptEducation(dto: EducationDto): Education {
  return {
    id: dto.id,
    school: dto.institute_university_name,
    degree: dto.degree_type as DegreeType,
    field: dto.field_of_study,
    start: toMonth(dto.start_date),
    end: toMonth(dto.end_date),
    percentage: dto.percentage == null ? null : Number(dto.percentage),
  }
}

function adaptExperience(dto: ExperienceDto): Experience {
  return {
    id: dto.id,
    company: dto.company_name,
    position: dto.position,
    city: dto.job_location_city,
    country: dto.job_location_country,
    start: toMonth(dto.start_date),
    end: toMonth(dto.end_date),
    description: dto.description,
  }
}

const adaptSkill = (dto: SeekerSkillReadDto): SeekerSkill => ({
  id: dto.id,
  name: dto.skill_set.skill_name,
  level: dto.skill_level,
})

export async function getSeekerProfile(): Promise<SeekerProfile> {
  const me = await getMe()
  const dash = await getSeekerDashboard(me.id)
  return {
    id: me.id,
    firstName: dash.profile.first_name,
    lastName: dash.profile.last_name,
    email: me.email,
    contact: dash.profile.contact_details,
    goals: dash.profile.goals,
    resumeUrl: dash.profile.resume_url,
    photo: me.user_image_url,
    dob: me.date_of_birth ?? '',
    sex: toSex(me.sex),
    education: dash.education.map(adaptEducation),
    experience: dash.experience.map(adaptExperience),
    skills: dash.skills.map(adaptSkill),
  }
}

const PROFILE_KEYS = ['firstName', 'lastName', 'contact', 'goals', 'resumeUrl'] as const
const ACCOUNT_KEYS = ['dob', 'sex', 'photo'] as const

export async function updateSeekerProfile(
  patch: Partial<SeekerProfile>,
): Promise<Partial<SeekerProfile>> {
  const profileBody: Record<string, unknown> = {}
  if (patch.firstName !== undefined) profileBody.first_name = patch.firstName
  if (patch.lastName !== undefined) profileBody.last_name = patch.lastName
  if (patch.contact !== undefined) profileBody.contact_details = patch.contact
  if (patch.goals !== undefined) profileBody.goals = patch.goals
  if (patch.resumeUrl !== undefined) profileBody.resume_url = patch.resumeUrl

  const accountBody: Record<string, unknown> = {}
  if (patch.dob !== undefined) accountBody.date_of_birth = patch.dob || null
  if (patch.sex !== undefined) accountBody.sex = patch.sex
  if (patch.photo !== undefined) accountBody.user_image_url = patch.photo

  const calls: Promise<unknown>[] = []
  if (Object.keys(profileBody).length > 0) {
    const me = await getMe()
    calls.push(patchSeekerProfile(me.id, profileBody))
  }
  if (Object.keys(accountBody).length > 0) {
    calls.push(apiPatch<UserAccount>('/accounts/me/', { body: accountBody }))
  }
  await Promise.all(calls)
  return patch
}

export async function addEducation(input: Omit<Education, 'id'>): Promise<Education> {
  const dto = await createEducation({
    institute_university_name: input.school,
    degree_type: input.degree,
    field_of_study: input.field,
    start_date: toApiDate(input.start),
    end_date: toApiDate(input.end),
    percentage: input.percentage == null ? null : String(input.percentage),
  })
  return adaptEducation(dto)
}

export const deleteEducation = (id: string): Promise<void> => apiDeleteEducation(id)

export async function addExperience(input: Omit<Experience, 'id'>): Promise<Experience> {
  const dto = await createExperience({
    company_name: input.company,
    position: input.position,
    description: input.description,
    job_location_city: input.city,
    job_location_country: input.country,
    start_date: toApiDate(input.start),
    end_date: toApiDate(input.end),
  })
  return adaptExperience(dto)
}

export const deleteExperience = (id: string): Promise<void> => apiDeleteExperience(id)

export async function addSkill(input: { name: string; level: SkillLevel }): Promise<SeekerSkill> {
  // The create response carries the bare skill_set UUID, not the name — the
  // caller already knows the name it submitted.
  const dto = await createSeekerSkill({ skill_name: input.name, skill_level: input.level })
  return { id: dto.id, name: input.name, level: input.level }
}

export const deleteSkill = (id: string): Promise<void> => deleteSeekerSkill(id)
