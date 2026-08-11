/** Real application services for the signed-in seeker, plus the company-side
 * applicant-detail composite (application + seeker dashboard join). */
import { ApiError } from '@/lib/api/client'
import { getMe } from '@/lib/api/auth'
import {
  getApplicationById, getApplications, patchApplicationStatus, postApply,
} from '@/lib/api/applications'
import { getSeekerDashboard } from '@/lib/api/seekers'
import type { ApplicationJobPostDto, ApplicationReadDto } from '@/lib/api/types'
import { num } from './adapter-utils'
import { adaptEducation, adaptExperience } from './seeker'
import type {
  Application, ApplicantDetail, ApplicantProfile, ApplicationJob, ApplicationWithJob,
} from './types'

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
    applicant: dto.applicant
      ? { id: dto.applicant.id, name: `${dto.applicant.first_name} ${dto.applicant.last_name}`.trim() }
      : null,
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

/** Company-side composite for the applicant-detail screen: joins the
 * application onto the applying seeker's dashboard. Only a 404 on either leg
 * is a legitimate "not there" outcome (deleted application / deleted
 * profile) — any other error must propagate so the screen shows a real
 * failure instead of silently rendering an empty state. */
export async function getApplicantDetail(applicationId: string): Promise<ApplicantDetail | null> {
  let dto: ApplicationReadDto
  try {
    dto = await getApplicationById(applicationId)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }

  let profile: ApplicantProfile | null = null
  try {
    const dash = await getSeekerDashboard(dto.user_account)
    profile = {
      name: `${dash.profile.first_name} ${dash.profile.last_name}`.trim(),
      goals: dash.profile.goals,
      contactDetails: dash.profile.contact_details,
      resumeUrl: dash.profile.resume_url,
      skills: dash.skills.map((s) => ({ name: s.skill_set.skill_name, level: s.skill_level })),
      education: dash.education.map(adaptEducation),
      experience: dash.experience.map(adaptExperience),
    }
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err
    // Profile deleted out from under an existing application — keep the
    // application, the screen renders the null-profile fallback.
  }

  return { application: adaptApplication(dto), profile, userId: dto.user_account }
}

export async function setApplicantStatus(
  applicationId: string,
  status: 'reviewed' | 'accepted' | 'rejected',
): Promise<void> {
  await patchApplicationStatus(applicationId, status)
}
