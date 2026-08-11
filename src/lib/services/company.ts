/** Company console services: dashboard/profile/images composites, job-post
 * CRUD + saveJob create/edit composite. */
import { getMe } from '@/lib/api/auth'
import {
  deleteCompanyImage, getCompanyDashboard, patchCompanyProfile, postCompanyImage,
} from '@/lib/api/companies'
import { getJobPost, getJobPosts } from '@/lib/api/public'
import {
  deleteJobPost, deleteJobSkill, patchJobPost, patchJobSkill,
  postJobLocation, postJobPost, postJobSkill,
} from '@/lib/api/jobs'
import { ApiError } from '@/lib/api/client'
import { num } from './adapter-utils'
import { listStreamOptions } from './meta'
import type { JobPost, JobPostWriteBody } from '@/lib/api/types'
import type { CompanyConsole, CompanyJobDetail, CompanyJobInput, CompanyJobRow, CompanyProfilePatch } from './types'

export async function getCompanyConsole(): Promise<CompanyConsole> {
  const me = await getMe()
  const dash = await getCompanyDashboard(me.id)
  let streamName: string | null = null
  try {
    const options = await listStreamOptions()
    streamName = options.find((o) => o.id === dash.company.business_stream)?.name ?? null
  } catch {
    streamName = null // meta failure must not take the console down
  }
  return {
    companyId: dash.company.id,
    name: dash.company.company_name,
    streamId: dash.company.business_stream,
    streamName,
    status: dash.company.status,
    website: dash.company.company_website_url,
    description: dash.company.profile_description,
    images: dash.images.map((i) => ({ id: i.id, url: i.image_url })),
    stats: {
      activePosts: dash.stats.active_posts,
      totalApplicants: dash.stats.total_applications,
      newThisWeek: dash.stats.new_this_week,
    },
  }
}

export async function updateCompanyProfile(companyId: string, patch: CompanyProfilePatch): Promise<void> {
  const body: Record<string, unknown> = {}
  if (patch.name !== undefined) body.company_name = patch.name
  if (patch.streamId !== undefined) body.business_stream = patch.streamId
  if (patch.status !== undefined) body.status = patch.status
  if (patch.website !== undefined) body.company_website_url = patch.website
  if (patch.description !== undefined) body.profile_description = patch.description
  await patchCompanyProfile(companyId, body)
}

export async function addCompanyImage(url: string): Promise<void> {
  await postCompanyImage({ image_url: url })
}

export async function removeCompanyImage(imageId: string): Promise<void> {
  await deleteCompanyImage(imageId)
}

// ---------------------------------------------------------------------------
// Company jobs: list/detail adapters, saveJob create/edit composite, publish
// toggle, delete.
// ---------------------------------------------------------------------------

function adaptCompanyJob(dto: JobPost): CompanyJobRow {
  return {
    id: dto.id,
    title: dto.job_title,
    type: dto.job_type.job_type_name,
    typeId: dto.job_type.id,
    city: dto.job_location.city,
    country: dto.job_location.country,
    salaryMin: num(dto.salary_min),
    salaryMax: num(dto.salary_max),
    salaryType: dto.salary_type || null,
    deadline: dto.deadline_date,
    published: dto.is_published,
    active: dto.is_active,
    posted: dto.created_at.slice(0, 10),
  }
}

export async function listCompanyJobs(companyId: string): Promise<CompanyJobRow[]> {
  const page = await getJobPosts({ company: companyId, page_size: 100 })
  return page.results.map(adaptCompanyJob)
}

export async function getCompanyJob(id: string): Promise<CompanyJobDetail | null> {
  try {
    const dto = await getJobPost(id)
    return {
      ...adaptCompanyJob(dto),
      description: dto.job_description,
      skillRows: dto.required_skills.map((s) => ({
        id: s.id,
        name: s.skill_set.skill_name,
        level: s.skill_level,
        required: s.is_required,
      })),
    }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

/** Thrown when the job post exists but a follow-up location/skill call failed —
 * the page navigates to the edit view and lets the user retry. */
export class JobSaveError extends Error {
  constructor(
    readonly jobId: string,
    readonly cause: unknown,
  ) {
    super('Job saved, but some details failed to save')
  }
}

function toWireBody(input: CompanyJobInput, locationId?: string): Partial<JobPostWriteBody> {
  const body: Partial<JobPostWriteBody> = {
    job_title: input.title,
    job_description: input.description,
    job_type: input.typeId,
    salary_min: input.salaryMin,
    salary_max: input.salaryMax,
    salary_type: input.salaryType ?? '', // '' on the wire — never null (CharField blank)
    deadline_date: input.deadline,
    is_published: input.published,
  }
  if (locationId) body.job_location = locationId
  return body
}

export async function saveJob(input: CompanyJobInput, existing?: CompanyJobDetail): Promise<string> {
  if (!existing) {
    const location = await postJobLocation({ city: input.city, country: input.country })
    const post = await postJobPost(toWireBody(input, location.id) as JobPostWriteBody)
    try {
      for (const s of input.skills) {
        await postJobSkill({
          job_post: post.id, skill_name: s.name, skill_level: s.level, is_required: s.required,
        })
      }
    } catch (err) {
      throw new JobSaveError(post.id, err)
    }
    return post.id
  }

  // Edit: PATCH only what changed; a location change means a fresh location row
  // (locations are create-only for companies).
  let locationId: string | undefined
  if (input.city !== existing.city || input.country !== existing.country) {
    const location = await postJobLocation({ city: input.city, country: input.country })
    locationId = location.id
  }
  const full = toWireBody(input, locationId)
  const body: Partial<JobPostWriteBody> = {}
  if (input.title !== existing.title) body.job_title = full.job_title
  if (input.description !== existing.description) body.job_description = full.job_description
  if (input.typeId !== existing.typeId) body.job_type = full.job_type
  if (input.salaryMin !== existing.salaryMin) body.salary_min = full.salary_min
  if (input.salaryMax !== existing.salaryMax) body.salary_max = full.salary_max
  if (input.salaryType !== existing.salaryType) body.salary_type = full.salary_type
  if (input.deadline !== existing.deadline) body.deadline_date = full.deadline_date
  if (input.published !== existing.published) body.is_published = full.is_published
  if (locationId) body.job_location = locationId
  if (Object.keys(body).length > 0) await patchJobPost(existing.id, body)

  try {
    const keptIds = new Set(input.skills.filter((s) => s.id).map((s) => s.id))
    for (const row of existing.skillRows) {
      if (row.id && !keptIds.has(row.id)) await deleteJobSkill(row.id)
    }
    for (const s of input.skills) {
      if (!s.id) {
        await postJobSkill({
          job_post: existing.id, skill_name: s.name, skill_level: s.level, is_required: s.required,
        })
      } else {
        const prev = existing.skillRows.find((r) => r.id === s.id)
        if (prev && (prev.level !== s.level || prev.required !== s.required)) {
          await patchJobSkill(s.id, { skill_level: s.level, is_required: s.required })
        }
      }
    }
  } catch (err) {
    throw new JobSaveError(existing.id, err)
  }
  return existing.id
}

export async function setJobPublished(id: string, published: boolean): Promise<void> {
  await patchJobPost(id, { is_published: published })
}

export async function deleteJob(id: string): Promise<void> {
  await deleteJobPost(id)
}
