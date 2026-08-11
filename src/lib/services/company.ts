/** Company console services: dashboard/profile/images composites. */
import { getMe } from '@/lib/api/auth'
import {
  deleteCompanyImage, getCompanyDashboard, patchCompanyProfile, postCompanyImage,
} from '@/lib/api/companies'
import { listStreamOptions } from './meta'
import type { CompanyConsole, CompanyProfilePatch } from './types'

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
