/**
 * Meta lists: names for the filter selects, single-flight cached fetches,
 * and name→UUID resolution for query params.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import {
  BUSINESS_STREAMS_LIST,
  JOB_TYPES_LIST,
  JOB_TYPE_FULLTIME_ID,
  STREAM_ID,
  paginated,
} from '@/test/msw/fixtures'
import { _resetMetaForTests, listJobTypes, listStreams, resolveJobTypeId, resolveStreamId } from '../meta'

describe('services/meta', () => {
  beforeEach(() => _resetMetaForTests())

  it('returns job type and stream names', async () => {
    expect(await listJobTypes()).toEqual(['Full-time', 'Contract'])
    expect(await listStreams()).toEqual(['Data & AI', 'Software'])
  })

  it('fetches each meta list once across calls (single-flight cache)', async () => {
    let hits = 0
    server.use(
      http.get('*/api/v1/jobs/job-types/', () => {
        hits += 1
        return HttpResponse.json(paginated(JOB_TYPES_LIST))
      }),
    )
    await Promise.all([listJobTypes(), listJobTypes(), resolveJobTypeId('Full-time')])
    await listJobTypes()
    expect(hits).toBe(1)
  })

  it('resolves known names to UUIDs and unknown names to null', async () => {
    expect(await resolveJobTypeId('Full-time')).toBe(JOB_TYPE_FULLTIME_ID)
    expect(await resolveStreamId('Data & AI')).toBe(STREAM_ID)
    expect(await resolveJobTypeId('Internship')).toBeNull()
    expect(await resolveStreamId('Bogus')).toBeNull()
  })

  it('drops the cache on failure so the next call can retry', async () => {
    server.use(http.get('*/api/v1/jobs/job-types/', () => HttpResponse.error(), { once: true }))
    await expect(listJobTypes()).rejects.toBeTruthy()
    expect(await listJobTypes()).toEqual(['Full-time', 'Contract'])
  })
})
