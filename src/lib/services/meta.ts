/**
 * Reference data (job types, business streams): fetched once per session,
 * shared by the filter selects and by name→UUID resolution. The page URLs
 * keep human-readable names (?type=Full-time&stream=Software); these
 * helpers translate them to the UUID query params the API expects.
 */
import { getBusinessStreams, getJobTypes } from '@/lib/api/public'

interface MetaItem {
  id: string
  name: string
}

let jobTypesPromise: Promise<MetaItem[]> | null = null
let streamsPromise: Promise<MetaItem[]> | null = null

function fetchJobTypes(): Promise<MetaItem[]> {
  jobTypesPromise ??= getJobTypes()
    .then((page) => page.results.map((t) => ({ id: t.id, name: t.job_type_name })))
    .catch((err) => {
      jobTypesPromise = null // let the next caller retry
      throw err
    })
  return jobTypesPromise
}

function fetchStreams(): Promise<MetaItem[]> {
  streamsPromise ??= getBusinessStreams()
    .then((page) => page.results.map((s) => ({ id: s.id, name: s.business_stream_name })))
    .catch((err) => {
      streamsPromise = null
      throw err
    })
  return streamsPromise
}

export async function listJobTypes(): Promise<string[]> {
  return (await fetchJobTypes()).map((t) => t.name)
}

export async function listStreams(): Promise<string[]> {
  return (await fetchStreams()).map((s) => s.name)
}

export async function resolveJobTypeId(name: string): Promise<string | null> {
  return (await fetchJobTypes()).find((t) => t.name === name)?.id ?? null
}

export async function resolveStreamId(name: string): Promise<string | null> {
  return (await fetchStreams()).find((s) => s.name === name)?.id ?? null
}

export function _resetMetaForTests(): void {
  jobTypesPromise = null
  streamsPromise = null
}
