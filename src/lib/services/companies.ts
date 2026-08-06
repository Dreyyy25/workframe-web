/**
 * Real companies services over GET /companies/public/. Register auto-creates
 * every company user's profile as an active blank row, so the list adapter
 * filters out companies with an empty name.
 */
import { ApiError } from '@/lib/api/client'
import { getPublicCompanies, getPublicCompany } from '@/lib/api/public'
import type { PublicCompany } from '@/lib/api/types'
import { resolveStreamId } from './meta'
import type { Company, CompanyListItem } from './types'

/** "Halcyon Systems" → "HS"; single word → first letter. */
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

function adaptCompany(dto: PublicCompany, images: string[] = []): Company {
  return {
    id: dto.id,
    name: dto.company_name,
    stream: dto.business_stream.business_stream_name,
    website: dto.company_website_url.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
    status: dto.status,
    description: dto.profile_description,
    images,
    logo: initials(dto.company_name),
  }
}

export async function listCompanies(
  filters: { search?: string; stream?: string } = {},
): Promise<CompanyListItem[]> {
  const business_stream = filters.stream ? await resolveStreamId(filters.stream) : undefined
  if (business_stream === null) return []

  const page = await getPublicCompanies({
    search: filters.search || undefined,
    business_stream,
  })
  return page.results
    .filter((c) => c.company_name.trim() !== '')
    .map((c) => ({ ...adaptCompany(c), openRolesCount: c.open_roles_count }))
}

export async function getCompany(id: string): Promise<Company | null> {
  try {
    const dto = await getPublicCompany(id)
    if (dto.company_name.trim() === '') return null
    return adaptCompany(dto, dto.images.map((i) => i.image_url))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
