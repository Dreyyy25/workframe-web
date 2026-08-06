# Slice 2 — Public Browse on Real Data: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock seam behind the four public browse pages (+ landing featured roles) with a real `src/lib/services/` layer over the verified staging API.

**Architecture:** New `src/lib/services/` module owns the public view-model types and real adapters (jobs, companies, meta name↔UUID resolution). Pages re-point imports; `src/lib/mock/` keeps serving seeker/company screens by re-importing the shared types. Spec: `docs/superpowers/specs/2026-08-06-slice2-public-browse-design.md`.

**Tech Stack:** React 18 + TS, TanStack Query **v5** (`placeholderData: keepPreviousData`), Vitest 2 + MSW 2 (node server, `onUnhandledRequest: 'error'`), existing `apiGet` client from Slice 1.

## Global Constraints

- Conventional commits; **never** add a `Co-Authored-By: Claude` trailer.
- `npm run test` and `npm run typecheck` must be green at the end of every task.
- MSW handlers use wildcard origins (`*/api/v1/...`); every endpoint a test touches needs a handler (unhandled requests are errors).
- Services return **`null`** for missing entities (TanStack v5 errors if a `queryFn` resolves `undefined` — same reason the mock returns `null`).
- Backend truth (verified @ staging `5c57450`): decimal fields are **strings**; `salary_type` may be `""`; `deadline_date` nullable; lists use `{count, next, previous, results}`; `page_size` ≤ 100.
- Do not change any `src/lib/mock/` runtime behavior — type re-imports only.
- The dev backend is the sibling repo `C:\Users\almos\Projects\Job-Board-API-only` on `staging` (only needed for Task 8).

---

### Task 1: Shared public view models (`services/types.ts`) + mock re-imports

**Files:**
- Create: `src/lib/services/types.ts`
- Modify: `src/lib/mock/types.ts` (delete moved defs, re-export), `src/lib/mock/services.ts` (drop local `JobWithCompany`/`JobFilters`, re-export from services)
- Modify: `docs/superpowers/specs/2026-08-06-slice2-public-browse-design.md` (one line: §4.3 `undefined` → `null`)

**Interfaces:**
- Produces (used by every later task):
  - `SalaryType = 'hourly' | 'monthly' | 'yearly'`, `SkillLevel`, `CompanyStatus`
  - `JobSkill {name: string; level: SkillLevel; required: boolean}`
  - `Job {id; companyId; title; type; city; country; salaryMin: number | null; salaryMax: number | null; salaryType: SalaryType | null; deadline: string | null; posted: string; published: boolean; skills: JobSkill[]; description: string}`
  - `CompanyRef {id: string; name: string}`, `JobWithCompany = Job & {company: CompanyRef}`
  - `Company {id; name; stream; website; status: CompanyStatus; description; images: string[]; logo: string}`
  - `CompanyListItem = Company & {openRolesCount: number}`
  - `JobFilters {search?; type?; stream?; minSalary?; sort?: 'newest' | 'salary'; page?; pageSize?}`

This task is types-only: its test cycle is the type checker plus the existing 63-test suite (mock data must still satisfy the widened types).

- [ ] **Step 1: Create `src/lib/services/types.ts`**

```typescript
/**
 * Public-domain view models — the single source of truth consumed by the
 * browse screens. `src/lib/mock/` re-imports these so mock data and the
 * real services layer share one set of shapes.
 *
 * Deliberate deltas from the original mock shapes (see spec §4.2):
 *  - `Job.deadline` and `Job.salaryType` are nullable (backend allows both).
 *  - `JobWithCompany.company` is a light ref — screens only use id + name,
 *    and the mock's full Company object still satisfies it structurally.
 */

export type SalaryType = 'hourly' | 'monthly' | 'yearly'
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'
export type CompanyStatus = 'active' | 'inactive' | 'suspended'

export interface JobSkill {
  name: string
  level: SkillLevel
  required: boolean
}

export interface Job {
  id: string
  companyId: string
  title: string
  type: string
  city: string
  country: string
  salaryMin: number | null
  salaryMax: number | null
  salaryType: SalaryType | null
  /** YYYY-MM-DD; null when the posting has no deadline. */
  deadline: string | null
  /** YYYY-MM-DD */
  posted: string
  published: boolean
  skills: JobSkill[]
  description: string
}

export interface CompanyRef {
  id: string
  name: string
}

export interface JobWithCompany extends Job {
  company: CompanyRef
}

export interface Company {
  id: string
  name: string
  stream: string
  /** Bare domain (protocol stripped) — screens render `https://${website}`. */
  website: string
  status: CompanyStatus
  description: string
  images: string[]
  /** Short initials shown in the logo tile, e.g. "NL". */
  logo: string
}

export interface CompanyListItem extends Company {
  openRolesCount: number
}

export interface JobFilters {
  search?: string
  type?: string
  stream?: string
  minSalary?: number
  sort?: 'newest' | 'salary'
  page?: number
  pageSize?: number
}
```

- [ ] **Step 2: Re-point `src/lib/mock/types.ts`**

Delete its local `SalaryType`, `SkillLevel`, `JobSkill`, `Company`, `Job` definitions (keep `UserType`, `AppStatus`, `DegreeType`, `CompanyStatus`? — **no**: `CompanyStatus` also moves; keep everything else). Replace with re-exports at the top of the file:

```typescript
export type {
  Company,
  CompanyStatus,
  Job,
  JobSkill,
  SalaryType,
  SkillLevel,
} from '../services/types'
```

Everything else in `mock/types.ts` (Application, Applicant, SeekerProfile, Education, Experience, …) stays. Types that referenced the deleted names (e.g. `SeekerSkill` using `SkillLevel`) now resolve via the re-export — add `import type { SkillLevel } from '../services/types'` at the top if any local interface references it directly.

- [ ] **Step 3: Re-point `src/lib/mock/services.ts`**

Delete the local `JobWithCompany` and `JobFilters` interface definitions (keep `CompanyWithRoles`, `ApplicationWithJob`, `ApplicantWithJob`, `CompanyJobRow`). Add:

```typescript
import type { JobFilters, JobWithCompany } from '../services/types'
export type { JobFilters, JobWithCompany } from '../services/types'
```

`join()` returns `{...j, company: <full Company>}`, which satisfies `JobWithCompany`'s `CompanyRef` structurally — no body changes anywhere.

- [ ] **Step 4: Fix the spec's return-type line**

In `docs/superpowers/specs/2026-08-06-slice2-public-browse-design.md` §4.3, change both `Promise<JobWithCompany | undefined>` / `Promise<Company | undefined>` mentions and the two "404 → `undefined`" phrases to `null` (TanStack v5 rejects `undefined` query data).

- [ ] **Step 5: Verify**

Run: `npm run typecheck` — expect clean (mock data/screens satisfy the widened types; `formatDate`/`money` already accept null).
Run: `npm run test` — expect 63 passing, unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/types.ts src/lib/mock/types.ts src/lib/mock/services.ts docs/superpowers/specs/2026-08-06-slice2-public-browse-design.md
git commit -m "refactor(types): move public view models to services/types as single source of truth"
```

---

### Task 2: API DTOs + `public.ts` + landing single-call rewrite + browse fixtures/handlers

**Files:**
- Modify: `src/lib/api/types.ts` (rewrite `JobPost` to nested read shape; add public-company DTOs)
- Modify: `src/lib/api/public.ts` (extend `getJobPosts` params; add `getJobPost`, `getPublicCompanies`, `getPublicCompany`; delete `getJobLocations`)
- Modify: `src/components/landing/featured-jobs.tsx` (single-call load, company name)
- Modify: `src/test/msw/fixtures.ts`, `src/test/msw/handlers.ts` (browse fixtures + handlers)
- Test: `src/components/landing/__tests__/featured-jobs.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces (Tasks 3–7 rely on these exact names):
  - DTOs in `api/types.ts`: `JobPostCompanyRef {id; company_name; business_stream: BusinessStream}`, `JobTypeRef {id; job_type_name}`, `RequiredSkill {id; skill_set: {id: string; skill_name: string}; skill_level: SkillLevel; is_required: boolean}`, rewritten `JobPost` (below), `PublicCompany`, `PublicCompanyDetail`, `PublicCompanyImage`
  - `api/public.ts`: `getJobPosts(params?: JobPostQuery): Promise<Paginated<JobPost>>`, `getJobPost(id: string): Promise<JobPost>`, `getPublicCompanies(params?): Promise<Paginated<PublicCompany>>`, `getPublicCompany(id: string): Promise<PublicCompanyDetail>`
  - Fixtures: `JOB_POST_ID`, `PUBLIC_COMPANY_ID`, `JOB_TYPE_FULLTIME_ID`, `jobPost(overrides?)`, `publicCompany(overrides?)`, `publicCompanyDetail(overrides?)`, `JOB_TYPES_LIST`, `BUSINESS_STREAMS_LIST`
  - Handlers (wildcard, no auth — endpoints are AllowAny): `GET */api/v1/jobs/job-posts/`, `GET */api/v1/jobs/job-posts/:id/`, `GET */api/v1/jobs/job-types/`, `GET */api/v1/companies/business-streams/`, `GET */api/v1/companies/public/`, `GET */api/v1/companies/public/:id/`

- [ ] **Step 1: Rewrite the job DTOs in `src/lib/api/types.ts`**

Replace the current `JobPost` interface (bare-UUID FKs) with the staging nested read shape; keep `JobType`, `JobLocation`, `BusinessStream`, `Paginated`, `SalaryType` as they are:

```typescript
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert'

export interface JobTypeRef {
  id: string
  job_type_name: string
}

export interface JobPostCompanyRef {
  id: string // Company id (NOT the owning user-account id)
  company_name: string
  business_stream: BusinessStream
}

export interface RequiredSkill {
  id: string
  skill_set: { id: string; skill_name: string }
  skill_level: SkillLevel
  is_required: boolean
}

/** Mirrors the staging JobPostReadSerializer (list + retrieve, nested). */
export interface JobPost {
  id: string
  company: JobPostCompanyRef
  job_type: JobTypeRef
  job_location: JobLocation
  required_skills: RequiredSkill[]
  job_title: string
  job_description: string
  /** Decimal serialized as string, e.g. "120000.00". */
  salary_min: string | null
  salary_max: string | null
  /** "" when unset — never null. */
  salary_type: SalaryType | ''
  deadline_date: string | null
  is_published: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
```

And add the public-company DTOs after `CompanyDashboard`:

```typescript
export interface PublicCompanyImage {
  id: string
  image_url: string
  created_at: string
}

/** GET /companies/public/ list item. contact_email/user_account are excluded server-side. */
export interface PublicCompany {
  id: string
  company_name: string
  business_stream: BusinessStream
  profile_description: string
  company_website_url: string
  status: 'active'
  open_roles_count: number
}

/** GET /companies/public/{id}/ — list shape plus images. */
export interface PublicCompanyDetail extends PublicCompany {
  images: PublicCompanyImage[]
}
```

- [ ] **Step 2: Rewrite `src/lib/api/public.ts`**

```typescript
import { apiGet } from './client'
import type {
  BusinessStream,
  JobPost,
  JobType,
  Paginated,
  PublicCompany,
  PublicCompanyDetail,
} from './types'

export interface JobPostQuery {
  search?: string
  job_type?: string
  business_stream?: string
  salary_floor?: number
  company?: string
  ordering?: string
  page?: number
  page_size?: number
}

export function getJobPosts(params?: JobPostQuery) {
  return apiGet<Paginated<JobPost>>('/jobs/job-posts/', { ...params })
}

export function getJobPost(id: string) {
  return apiGet<JobPost>(`/jobs/job-posts/${id}/`)
}

export function getJobTypes() {
  return apiGet<Paginated<JobType>>('/jobs/job-types/', { page_size: 100 })
}

export function getBusinessStreams() {
  return apiGet<Paginated<BusinessStream>>('/companies/business-streams/', { page_size: 100 })
}

export function getPublicCompanies(params?: { search?: string; business_stream?: string }) {
  return apiGet<Paginated<PublicCompany>>('/companies/public/', { ...params, page_size: 100 })
}

export function getPublicCompany(id: string) {
  return apiGet<PublicCompanyDetail>(`/companies/public/${id}/`)
}
```

(`getJobLocations` is deleted — its only consumer was the landing join removed in Step 4.)

- [ ] **Step 3: Add browse fixtures to `src/test/msw/fixtures.ts`**

Append (import `JobPost`, `PublicCompany`, `PublicCompanyDetail` types at the top):

```typescript
export const JOB_POST_ID = '55555555-5555-4555-8555-555555555555'
export const PUBLIC_COMPANY_ID = '66666666-6666-4666-8666-666666666666'
export const JOB_TYPE_FULLTIME_ID = '77777777-7777-4777-8777-777777777777'
export const SKILL_ID = '88888888-8888-4888-8888-888888888888'

export const BUSINESS_STREAMS_LIST = [
  { id: STREAM_ID, business_stream_name: 'Data & AI' },
  { id: '44444444-4444-4444-8444-444444444445', business_stream_name: 'Software' },
]

export const JOB_TYPES_LIST = [
  { id: JOB_TYPE_FULLTIME_ID, job_type_name: 'Full-time', description: '' },
  { id: '77777777-7777-4777-8777-777777777778', job_type_name: 'Contract', description: '' },
]

export function jobPost(overrides: Partial<JobPost> = {}): JobPost {
  return {
    id: JOB_POST_ID,
    company: {
      id: PUBLIC_COMPANY_ID,
      company_name: 'Halcyon Systems',
      business_stream: BUSINESS_STREAMS_LIST[0],
    },
    job_type: { id: JOB_TYPE_FULLTIME_ID, job_type_name: 'Full-time' },
    job_location: {
      id: '99999999-9999-4999-8999-999999999999',
      street_address: '',
      city: 'Berlin',
      country: 'Germany',
      zip: '',
      country_code: 'DE',
    },
    required_skills: [
      {
        id: SKILL_ID,
        skill_set: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', skill_name: 'Python' },
        skill_level: 'Advanced',
        is_required: true,
      },
    ],
    job_title: 'Machine Learning Engineer',
    job_description: 'Build models.',
    salary_min: '90000.00',
    salary_max: '120000.00',
    salary_type: 'yearly',
    deadline_date: '2026-09-01',
    is_published: true,
    is_active: true,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function publicCompany(overrides: Partial<PublicCompany> = {}): PublicCompany {
  return {
    id: PUBLIC_COMPANY_ID,
    company_name: 'Halcyon Systems',
    business_stream: BUSINESS_STREAMS_LIST[0],
    profile_description: 'We build data platforms.',
    company_website_url: 'https://halcyon.io',
    status: 'active',
    open_roles_count: 2,
    ...overrides,
  }
}

export function publicCompanyDetail(
  overrides: Partial<PublicCompanyDetail> = {},
): PublicCompanyDetail {
  return {
    ...publicCompany(),
    images: [
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        image_url: 'https://img.example/office.jpg',
        created_at: '2026-08-01T10:00:00Z',
      },
    ],
    ...overrides,
  }
}

export function paginated<T>(results: T[]) {
  return { count: results.length, next: null, previous: null, results }
}
```

- [ ] **Step 4: Add default browse handlers to `src/test/msw/handlers.ts`**

Append inside the `handlers` array (import the new fixtures). Defaults are dumb happy paths; tests override with `server.use(...)` to assert params or vary data:

```typescript
  http.get('*/api/v1/jobs/job-posts/', () =>
    HttpResponse.json(paginated([jobPost()])),
  ),
  http.get('*/api/v1/jobs/job-posts/:id/', ({ params }) =>
    params.id === JOB_POST_ID
      ? HttpResponse.json(jobPost())
      : HttpResponse.json({ detail: 'No JobPost matches the given query.' }, { status: 404 }),
  ),
  http.get('*/api/v1/jobs/job-types/', () => HttpResponse.json(paginated(JOB_TYPES_LIST))),
  http.get('*/api/v1/companies/business-streams/', () =>
    HttpResponse.json(paginated(BUSINESS_STREAMS_LIST)),
  ),
  http.get('*/api/v1/companies/public/', () =>
    HttpResponse.json(paginated([publicCompany()])),
  ),
  http.get('*/api/v1/companies/public/:id/', ({ params }) =>
    params.id === PUBLIC_COMPANY_ID
      ? HttpResponse.json(publicCompanyDetail())
      : HttpResponse.json({ detail: 'No Company matches the given query.' }, { status: 404 }),
  ),
```

- [ ] **Step 5: Write the failing landing test** — `src/components/landing/__tests__/featured-jobs.test.tsx`

```tsx
/**
 * FeaturedJobs after the nested-read migration: one request to job-posts,
 * no join fetches, company names rendered from the nested payload.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { jobPost, paginated } from '@/test/msw/fixtures'
import { FeaturedJobs } from '../featured-jobs'

function renderFeatured() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <FeaturedJobs />
    </QueryClientProvider>,
  )
}

describe('FeaturedJobs', () => {
  it('renders nested API data with company names from a single request', async () => {
    const hits: string[] = []
    server.use(
      http.get('*/api/v1/jobs/job-posts/', ({ request }) => {
        hits.push(request.url)
        return HttpResponse.json(paginated([jobPost()]))
      }),
    )
    renderFeatured()
    expect(await screen.findByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(screen.getByText('Halcyon Systems')).toBeInTheDocument()
    expect(screen.getByText('Berlin, Germany')).toBeInTheDocument()
    expect(hits).toHaveLength(1)
    expect(hits[0]).toContain('page_size=6')
  })

  it('falls back to seed content when the API errors', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () => HttpResponse.error()),
    )
    renderFeatured()
    expect(await screen.findByText('Senior Frontend Engineer')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run the new test — expect FAIL**

Run: `npx vitest run src/components/landing` — fails (typecheck errors in `featured-jobs.tsx` against the new DTO, or join fetches hitting removed handlers).

- [ ] **Step 7: Rewrite `loadFeatured` in `featured-jobs.tsx`**

Replace the import line and `loadFeatured`:

```typescript
import { getJobPosts } from '@/lib/api/public'

async function loadFeatured(): Promise<JobCardData[]> {
  const posts = await getJobPosts({ page_size: 6, ordering: '-created_at' })
  return posts.results.map((p) => ({
    id: p.id,
    title: p.job_title,
    company: p.company.company_name,
    location: [p.job_location.city, p.job_location.country !== '—' ? p.job_location.country : null]
      .filter(Boolean)
      .join(', ') || '—',
    type: p.job_type.job_type_name,
    salary: money(
      p.salary_min == null ? null : Number(p.salary_min),
      p.salary_max == null ? null : Number(p.salary_max),
      p.salary_type || null,
    ),
  }))
}
```

- [ ] **Step 8: Run tests + typecheck — expect PASS**

Run: `npx vitest run src/components/landing` then `npm run typecheck` then `npm run test` (full suite green — auth tests unaffected).

- [ ] **Step 9: Commit**

```bash
git add src/lib/api/types.ts src/lib/api/public.ts src/components/landing/featured-jobs.tsx src/components/landing/__tests__/featured-jobs.test.tsx src/test/msw/fixtures.ts src/test/msw/handlers.ts
git commit -m "feat(api): nested job-post read DTOs, public company endpoints, single-call landing load"
```

---

### Task 3: `services/meta.ts` — cached meta lists + name→UUID resolution

**Files:**
- Create: `src/lib/services/meta.ts`
- Test: `src/lib/services/__tests__/meta.test.ts`

**Interfaces:**
- Consumes: `getJobTypes`, `getBusinessStreams` from `@/lib/api/public`.
- Produces: `listJobTypes(): Promise<string[]>`, `listStreams(): Promise<string[]>`, `resolveJobTypeId(name: string): Promise<string | null>`, `resolveStreamId(name: string): Promise<string | null>`, `_resetMetaForTests(): void`.

- [ ] **Step 1: Write the failing tests** — `src/lib/services/__tests__/meta.test.ts`

```typescript
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/services` — FAIL ("Cannot find module '../meta'").

- [ ] **Step 3: Implement `src/lib/services/meta.ts`**

```typescript
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
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/lib/services` then `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/meta.ts src/lib/services/__tests__/meta.test.ts
git commit -m "feat(services): cached meta lists with name-to-UUID resolution"
```

---

### Task 4: `services/jobs.ts` — job adapter + `listJobs` / `getJob` / `listCompanyRoles`

**Files:**
- Create: `src/lib/services/jobs.ts`
- Test: `src/lib/services/__tests__/jobs.test.ts`

**Interfaces:**
- Consumes: `getJobPost`, `getJobPosts` (`@/lib/api/public`); `ApiError` (`@/lib/api/client`); `resolveJobTypeId`, `resolveStreamId` (`./meta`); types from `./types`.
- Produces: `adaptJob(dto: JobPost): JobWithCompany`; `listJobs(filters?: JobFilters): Promise<{results: JobWithCompany[]; count: number}>`; `getJob(id: string): Promise<JobWithCompany | null>`; `listCompanyRoles(companyId: string): Promise<JobWithCompany[]>`.

- [ ] **Step 1: Write the failing tests** — `src/lib/services/__tests__/jobs.test.ts`

```typescript
/**
 * Jobs services: DTO→view-model adapter fidelity, filter-name resolution,
 * query-param mapping, and null on 404.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { JOB_POST_ID, PUBLIC_COMPANY_ID, jobPost, paginated } from '@/test/msw/fixtures'
import { _resetMetaForTests } from '../meta'
import { adaptJob, getJob, listCompanyRoles, listJobs } from '../jobs'

function captureJobsUrl(hits: URL[]) {
  server.use(
    http.get('*/api/v1/jobs/job-posts/', ({ request }) => {
      hits.push(new URL(request.url))
      return HttpResponse.json(paginated([jobPost()]))
    }),
  )
}

describe('adaptJob', () => {
  it('maps the nested DTO to the screen view model', () => {
    const job = adaptJob(jobPost())
    expect(job).toMatchObject({
      id: JOB_POST_ID,
      companyId: PUBLIC_COMPANY_ID,
      title: 'Machine Learning Engineer',
      type: 'Full-time',
      city: 'Berlin',
      country: 'Germany',
      salaryMin: 90000,
      salaryMax: 120000,
      salaryType: 'yearly',
      deadline: '2026-09-01',
      posted: '2026-08-01',
      published: true,
      company: { id: PUBLIC_COMPANY_ID, name: 'Halcyon Systems' },
    })
    expect(job.skills).toEqual([{ name: 'Python', level: 'Advanced', required: true }])
  })

  it('normalizes null salaries, empty salary_type, and null deadline', () => {
    const job = adaptJob(
      jobPost({ salary_min: null, salary_max: null, salary_type: '', deadline_date: null }),
    )
    expect(job.salaryMin).toBeNull()
    expect(job.salaryMax).toBeNull()
    expect(job.salaryType).toBeNull()
    expect(job.deadline).toBeNull()
  })
})

describe('listJobs', () => {
  beforeEach(() => _resetMetaForTests())

  it('maps filters to API params (newest sort)', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    await listJobs({ search: 'ml', type: 'Full-time', stream: 'Data & AI', minSalary: 100000, page: 2, pageSize: 9, sort: 'newest' })
    const q = hits[0].searchParams
    expect(q.get('search')).toBe('ml')
    expect(q.get('job_type')).toBeTruthy()
    expect(q.get('business_stream')).toBeTruthy()
    expect(q.get('salary_floor')).toBe('100000')
    expect(q.get('ordering')).toBe('-created_at')
    expect(q.get('page')).toBe('2')
    expect(q.get('page_size')).toBe('9')
  })

  it('uses -salary_rank for the salary sort', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    await listJobs({ sort: 'salary' })
    expect(hits[0].searchParams.get('ordering')).toBe('-salary_rank')
  })

  it('returns an empty page for an unknown type name without calling the API', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    const out = await listJobs({ type: 'Internship' })
    expect(out).toEqual({ results: [], count: 0 })
    expect(hits).toHaveLength(0)
  })

  it('returns adapted results with the backend count', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () =>
        HttpResponse.json({ ...paginated([jobPost()]), count: 42 }),
      ),
    )
    const out = await listJobs({})
    expect(out.count).toBe(42)
    expect(out.results[0].title).toBe('Machine Learning Engineer')
  })
})

describe('getJob / listCompanyRoles', () => {
  it('returns null for a missing job (404) and rethrows other errors', async () => {
    expect(await getJob('00000000-0000-4000-8000-000000000000')).toBeNull()
    server.use(
      http.get('*/api/v1/jobs/job-posts/:id/', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    await expect(getJob(JOB_POST_ID)).rejects.toBeTruthy()
  })

  it('fetches a company’s roles by company param', async () => {
    const hits: URL[] = []
    captureJobsUrl(hits)
    const roles = await listCompanyRoles(PUBLIC_COMPANY_ID)
    expect(hits[0].searchParams.get('company')).toBe(PUBLIC_COMPANY_ID)
    expect(hits[0].searchParams.get('page_size')).toBe('100')
    expect(roles[0].company.name).toBe('Halcyon Systems')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/services/__tests__/jobs.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/services/jobs.ts`**

```typescript
/**
 * Real jobs services behind the public browse screens. Adapts the staging
 * API's nested read DTOs to the screen view models and translates the
 * name-based JobFilters into UUID/ordering query params.
 */
import { ApiError } from '@/lib/api/client'
import { getJobPost, getJobPosts } from '@/lib/api/public'
import type { JobPost } from '@/lib/api/types'
import { resolveJobTypeId, resolveStreamId } from './meta'
import type { JobFilters, JobWithCompany } from './types'

const num = (v: string | null): number | null => (v == null ? null : Number(v))

export function adaptJob(dto: JobPost): JobWithCompany {
  return {
    id: dto.id,
    companyId: dto.company.id,
    title: dto.job_title,
    type: dto.job_type.job_type_name,
    city: dto.job_location.city,
    country: dto.job_location.country,
    salaryMin: num(dto.salary_min),
    salaryMax: num(dto.salary_max),
    salaryType: dto.salary_type || null,
    deadline: dto.deadline_date,
    posted: dto.created_at.slice(0, 10),
    published: dto.is_published,
    skills: dto.required_skills.map((s) => ({
      name: s.skill_set.skill_name,
      level: s.skill_level,
      required: s.is_required,
    })),
    description: dto.job_description,
    company: { id: dto.company.id, name: dto.company.company_name },
  }
}

const EMPTY = { results: [] as JobWithCompany[], count: 0 }

export async function listJobs(
  filters: JobFilters = {},
): Promise<{ results: JobWithCompany[]; count: number }> {
  const { search, type, stream, minSalary, sort = 'newest', page = 1, pageSize = 9 } = filters

  const job_type = type ? await resolveJobTypeId(type) : undefined
  if (job_type === null) return EMPTY
  const business_stream = stream ? await resolveStreamId(stream) : undefined
  if (business_stream === null) return EMPTY

  const page_ = await getJobPosts({
    search: search || undefined,
    job_type,
    business_stream,
    salary_floor: minSalary,
    ordering: sort === 'salary' ? '-salary_rank' : '-created_at',
    page,
    page_size: pageSize,
  })
  return { results: page_.results.map(adaptJob), count: page_.count }
}

export async function getJob(id: string): Promise<JobWithCompany | null> {
  try {
    return adaptJob(await getJobPost(id))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function listCompanyRoles(companyId: string): Promise<JobWithCompany[]> {
  const page = await getJobPosts({ company: companyId, page_size: 100 })
  return page.results.map(adaptJob)
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run src/lib/services` then `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/jobs.ts src/lib/services/__tests__/jobs.test.ts
git commit -m "feat(services): real listJobs/getJob/listCompanyRoles with nested-DTO adapter"
```

---

### Task 5: `services/companies.ts` + barrel `index.ts`

**Files:**
- Create: `src/lib/services/companies.ts`, `src/lib/services/index.ts`
- Test: `src/lib/services/__tests__/companies.test.ts`

**Interfaces:**
- Consumes: `getPublicCompanies`, `getPublicCompany` (`@/lib/api/public`); `ApiError`; `resolveStreamId` (`./meta`); types from `./types`.
- Produces: `listCompanies(filters?: {search?: string; stream?: string}): Promise<CompanyListItem[]>`; `getCompany(id: string): Promise<Company | null>`; barrel `index.ts` re-exporting **everything pages need**: all of `./types`, `listJobTypes`, `listStreams`, `listJobs`, `getJob`, `listCompanyRoles`, `listCompanies`, `getCompany`.

- [ ] **Step 1: Write the failing tests** — `src/lib/services/__tests__/companies.test.ts`

```typescript
/**
 * Companies services: public-directory adapter (protocol strip, initials,
 * stub filtering), images on retrieve, null on 404.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { PUBLIC_COMPANY_ID, paginated, publicCompany, publicCompanyDetail } from '@/test/msw/fixtures'
import { _resetMetaForTests } from '../meta'
import { getCompany, listCompanies } from '../companies'

describe('listCompanies', () => {
  beforeEach(() => _resetMetaForTests())

  it('adapts rows: name, stream, stripped website, initials logo, openRolesCount', async () => {
    const [c] = await listCompanies()
    expect(c).toMatchObject({
      id: PUBLIC_COMPANY_ID,
      name: 'Halcyon Systems',
      stream: 'Data & AI',
      website: 'halcyon.io',
      status: 'active',
      description: 'We build data platforms.',
      logo: 'HS',
      openRolesCount: 2,
      images: [],
    })
  })

  it('hides blank-named stub companies', async () => {
    server.use(
      http.get('*/api/v1/companies/public/', () =>
        HttpResponse.json(paginated([publicCompany(), publicCompany({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', company_name: '' })])),
      ),
    )
    const rows = await listCompanies()
    expect(rows).toHaveLength(1)
  })

  it('passes search/stream params; unknown stream short-circuits to []', async () => {
    const hits: URL[] = []
    server.use(
      http.get('*/api/v1/companies/public/', ({ request }) => {
        hits.push(new URL(request.url))
        return HttpResponse.json(paginated([publicCompany()]))
      }),
    )
    await listCompanies({ search: 'halcyon', stream: 'Data & AI' })
    expect(hits[0].searchParams.get('search')).toBe('halcyon')
    expect(hits[0].searchParams.get('business_stream')).toBeTruthy()

    expect(await listCompanies({ stream: 'Bogus' })).toEqual([])
    expect(hits).toHaveLength(1)
  })
})

describe('getCompany', () => {
  it('returns the detail shape with image URLs', async () => {
    const c = await getCompany(PUBLIC_COMPANY_ID)
    expect(c?.images).toEqual(['https://img.example/office.jpg'])
    expect(c?.logo).toBe('HS')
  })

  it('returns null on 404', async () => {
    expect(await getCompany('00000000-0000-4000-8000-000000000000')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/services/__tests__/companies.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/services/companies.ts`**

```typescript
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
    return adaptCompany(dto, dto.images.map((i) => i.image_url))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}
```

- [ ] **Step 4: Create `src/lib/services/index.ts`**

```typescript
export type {
  Company,
  CompanyListItem,
  CompanyRef,
  CompanyStatus,
  Job,
  JobFilters,
  JobSkill,
  JobWithCompany,
  SalaryType,
  SkillLevel,
} from './types'
export { listJobTypes, listStreams } from './meta'
export { getJob, listCompanyRoles, listJobs } from './jobs'
export { getCompany, listCompanies } from './companies'
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `npx vitest run src/lib/services` then `npm run typecheck`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/companies.ts src/lib/services/index.ts src/lib/services/__tests__/companies.test.ts
git commit -m "feat(services): real listCompanies/getCompany over the public directory"
```

---

### Task 6: Jobs + Companies pages on real services, debounced search, no skeleton flash

**Files:**
- Create: `src/lib/hooks/use-debounced-value.ts`
- Modify: `src/pages/public/jobs.tsx`, `src/pages/public/companies.tsx`, `src/components/jobs/job-card.tsx` (type import only)
- Test: `src/lib/hooks/__tests__/use-debounced-value.test.ts`, `src/pages/public/__tests__/jobs.test.tsx`, `src/pages/public/__tests__/companies.test.tsx`

**Interfaces:**
- Consumes: `listJobs`, `listJobTypes`, `listStreams`, `listCompanies` and types from `@/lib/services`.
- Produces: `useDebouncedValue<T>(value: T, delayMs?: number): T` (default 350 ms).

- [ ] **Step 1: Write the failing hook test** — `src/lib/hooks/__tests__/use-debounced-value.test.ts`

```typescript
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from '../use-debounced-value'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('only surfaces the latest value after the delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 350), {
      initialProps: { v: 'a' },
    })
    expect(result.current).toBe('a') // initial value passes through immediately
    rerender({ v: 'ab' })
    rerender({ v: 'abc' })
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(349))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('abc')
  })
})
```

- [ ] **Step 2: Run to verify failure, then implement** — `src/lib/hooks/use-debounced-value.ts`

Run: `npx vitest run src/lib/hooks` — FAIL. Then:

```typescript
import { useEffect, useState } from 'react'

/** Returns `value` after it has been stable for `delayMs` (default 350 ms). */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
```

Run again: PASS.

- [ ] **Step 3: Write the failing page tests** — `src/pages/public/__tests__/jobs.test.tsx`

```tsx
/**
 * Jobs page on real services: renders API fixtures, sends mapped query
 * params, keeps the count headline in sync.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { jobPost, paginated } from '@/test/msw/fixtures'
import { _resetMetaForTests } from '@/lib/services/meta'
import Jobs from '../jobs'

function renderJobs(initialEntry = '/jobs') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Jobs />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Jobs page', () => {
  beforeEach(() => _resetMetaForTests())

  it('renders jobs and the result count from the API', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () =>
        HttpResponse.json({ ...paginated([jobPost()]), count: 12 }),
      ),
    )
    renderJobs()
    expect(await screen.findByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(screen.getByText('12 open roles')).toBeInTheDocument()
    expect(screen.getByText('Halcyon Systems')).toBeInTheDocument()
  })

  it('sends mapped params when filters come from the URL', async () => {
    const hits: URL[] = []
    server.use(
      http.get('*/api/v1/jobs/job-posts/', ({ request }) => {
        hits.push(new URL(request.url))
        return HttpResponse.json(paginated([jobPost()]))
      }),
    )
    renderJobs('/jobs?type=Full-time&sort=salary&minSalary=100000')
    await screen.findByText('Machine Learning Engineer')
    const q = hits.at(-1)!.searchParams
    expect(q.get('job_type')).toBeTruthy()
    expect(q.get('ordering')).toBe('-salary_rank')
    expect(q.get('salary_floor')).toBe('100000')
  })

  it('shows the empty state when nothing matches', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/', () => HttpResponse.json(paginated([]))),
    )
    renderJobs('/jobs?search=nothing')
    expect(await screen.findByText('No roles match your filters')).toBeInTheDocument()
  })

  it('populates the type and category selects from the API', async () => {
    renderJobs()
    const user = userEvent.setup()
    // options load async from the meta queries — await them before selecting
    await screen.findByRole('option', { name: 'Full-time' })
    await screen.findByRole('option', { name: 'Data & AI' })
    await user.selectOptions(screen.getByLabelText('Job type'), 'Full-time')
  })
})
```

And `src/pages/public/__tests__/companies.test.tsx`:

```tsx
/**
 * Companies page on real services: cards with open-role counts, stub rows
 * hidden, search/stream params forwarded.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { paginated, publicCompany } from '@/test/msw/fixtures'
import { _resetMetaForTests } from '@/lib/services/meta'
import Companies from '../companies'

function renderCompanies(initialEntry = '/companies') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Companies />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Companies page', () => {
  beforeEach(() => _resetMetaForTests())

  it('renders company cards with open-role counts and hides blank stubs', async () => {
    server.use(
      http.get('*/api/v1/companies/public/', () =>
        HttpResponse.json(
          paginated([
            publicCompany(),
            publicCompany({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', company_name: '' }),
          ]),
        ),
      ),
    )
    renderCompanies()
    expect(await screen.findByText('Halcyon Systems')).toBeInTheDocument()
    expect(screen.getByText('2 open roles')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1) // stub filtered out
  })

  it('shows the empty state when the directory is empty', async () => {
    server.use(
      http.get('*/api/v1/companies/public/', () => HttpResponse.json(paginated([]))),
    )
    renderCompanies('/companies?search=nothing')
    expect(await screen.findByText('No companies found')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run to verify failure**

Run: `npx vitest run src/pages/public` — FAIL (pages still call mock services; count text differs; stub row rendered).

- [ ] **Step 5: Update `src/pages/public/jobs.tsx`**

Only these deltas (rest of the file unchanged):

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listJobs, listJobTypes, listStreams } from '@/lib/services'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
// (remove the '@/lib/mock/services' import)

// inside the component, above the queries:
const debouncedSearch = useDebouncedValue(search)

const { data: types } = useQuery({
  queryKey: ['job-types'],
  queryFn: listJobTypes,
  staleTime: Infinity,
})
const { data: streams } = useQuery({
  queryKey: ['streams'],
  queryFn: listStreams,
  staleTime: Infinity,
})
const { data, isLoading } = useQuery({
  queryKey: ['jobs', { search: debouncedSearch, type, stream, minSalary, sort, page }],
  queryFn: () =>
    listJobs({
      search: debouncedSearch || undefined,
      type: type || undefined,
      stream: stream || undefined,
      minSalary: minSalary ? Number(minSalary) : undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }),
  placeholderData: keepPreviousData,
})
```

- [ ] **Step 6: Update `src/pages/public/companies.tsx`**

Deltas:

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listCompanies, listStreams } from '@/lib/services'
import type { CompanyListItem } from '@/lib/services'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
// (remove both '@/lib/mock/services' imports)

const debouncedSearch = useDebouncedValue(search)

const { data: streams } = useQuery({ queryKey: ['streams'], queryFn: listStreams, staleTime: Infinity })
const { data, isLoading } = useQuery({
  queryKey: ['companies', { search: debouncedSearch, stream }],
  queryFn: () => listCompanies({ search: debouncedSearch || undefined, stream: stream || undefined }),
  placeholderData: keepPreviousData,
})
```

And the card at the bottom of the file:

```tsx
function CompanyCard({ company }: { company: CompanyListItem }) {
  // ... unchanged markup, except the roles line:
  {company.openRolesCount} open {company.openRolesCount === 1 ? 'role' : 'roles'}
}
```

- [ ] **Step 7: Re-point `src/components/jobs/job-card.tsx`**

```tsx
import type { JobWithCompany } from '@/lib/services'
```

- [ ] **Step 8: Run tests + typecheck — expect PASS**

Run: `npx vitest run src/pages/public src/lib/hooks`, `npm run typecheck`, then `npm run test` (full suite).

- [ ] **Step 9: Commit**

```bash
git add src/lib/hooks src/pages/public/jobs.tsx src/pages/public/companies.tsx src/components/jobs/job-card.tsx src/pages/public/__tests__
git commit -m "feat(browse): jobs and companies pages on real API with debounced search"
```

---

### Task 7: Job detail + Company profile pages

**Files:**
- Modify: `src/pages/public/job-detail.tsx`, `src/pages/public/company-profile.tsx`, `src/components/jobs/apply-modal.tsx` (type import only)
- Test: `src/pages/public/__tests__/job-detail.test.tsx`, `src/pages/public/__tests__/company-profile.test.tsx`

**Interfaces:**
- Consumes: `getJob`, `getCompany`, `listCompanyRoles` from `@/lib/services`; `hasApplied` **stays imported from `@/lib/mock/services`** (Slice 3 wires it).

- [ ] **Step 1: Write the failing tests** — `src/pages/public/__tests__/job-detail.test.tsx`

```tsx
/**
 * Job detail on real services: nested fields, skills chips, company link,
 * guest CTA, and no deadline UI when deadline is null. Auth is mocked as
 * a guest (the page only reads user/isSeeker/isCompany).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { JOB_POST_ID, PUBLIC_COMPANY_ID, jobPost } from '@/test/msw/fixtures'
import JobDetail from '../job-detail'

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ user: null, isLoading: false, isSeeker: false, isCompany: false }),
}))

function renderDetail(id = JOB_POST_ID) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/jobs/${id}`]}>
        <Routes>
          <Route path="/jobs/:id" element={<JobDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('JobDetail', () => {
  it('renders the job with skills and a company link', async () => {
    renderDetail()
    expect(await screen.findByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(screen.getByText('Python')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Halcyon Systems' })).toHaveAttribute(
      'href',
      `/companies/${PUBLIC_COMPANY_ID}`,
    )
    expect(screen.getByRole('button', { name: 'Log in to apply' })).toBeInTheDocument()
    expect(screen.getByText(/Apply by/)).toBeInTheDocument()
  })

  it('omits the deadline UI when deadline_date is null', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/:id/', () =>
        HttpResponse.json(jobPost({ deadline_date: null })),
      ),
    )
    renderDetail()
    await screen.findByText('Machine Learning Engineer')
    expect(screen.queryByText(/Apply by/)).not.toBeInTheDocument()
    expect(screen.queryByText('Deadline')).not.toBeInTheDocument()
  })

  it('shows the not-found state for a missing job', async () => {
    renderDetail('00000000-0000-4000-8000-000000000000')
    expect(await screen.findByText('Role not found')).toBeInTheDocument()
  })
})
```

And `src/pages/public/__tests__/company-profile.test.tsx`:

```tsx
/**
 * Company profile on real services: header, gallery from retrieve images,
 * open roles fetched via listCompanyRoles.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PUBLIC_COMPANY_ID } from '@/test/msw/fixtures'
import CompanyProfile from '../company-profile'

function renderProfile(id = PUBLIC_COMPANY_ID) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/companies/${id}`]}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyProfile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CompanyProfile', () => {
  it('renders header, gallery, and open roles from the API', async () => {
    renderProfile()
    expect(await screen.findByRole('heading', { name: 'Halcyon Systems' })).toBeInTheDocument()
    expect(screen.getByText('Data & AI')).toBeInTheDocument()
    expect(screen.getByAltText('Halcyon Systems workplace')).toHaveAttribute(
      'src',
      'https://img.example/office.jpg',
    )
    expect(await screen.findByText('Machine Learning Engineer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Visit website/ })).toHaveAttribute(
      'href',
      'https://halcyon.io',
    )
  })

  it('shows the not-found state for a missing company', async () => {
    renderProfile('00000000-0000-4000-8000-000000000000')
    expect(await screen.findByText('Company not found')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/pages/public/__tests__/job-detail.test.tsx src/pages/public/__tests__/company-profile.test.tsx` — FAIL (pages hit mock stores; deadline always rendered; roles come from `openRoles`).

- [ ] **Step 3: Update `src/pages/public/job-detail.tsx`**

Import deltas:

```tsx
import { getJob } from '@/lib/services'
import { hasApplied } from '@/lib/mock/services' // Slice 3 replaces this
```

Deadline badge becomes conditional (in the badges row):

```tsx
{job.deadline && (
  <Badge variant="muted">
    <CalendarClock />
    Apply by {formatDate(job.deadline)}
  </Badge>
)}
```

Sidebar rows (keep Posted unconditional):

```tsx
<Row label="Posted" value={formatDate(job.posted)} />
{job.deadline && <Row label="Deadline" value={formatDate(job.deadline)} />}
```

- [ ] **Step 4: Update `src/pages/public/company-profile.tsx`**

```tsx
import { getCompany, listCompanyRoles } from '@/lib/services'

// second query, after the company query:
const { data: roles } = useQuery({
  queryKey: ['company-roles', id],
  queryFn: () => listCompanyRoles(id),
  enabled: Boolean(company),
})
```

Open-roles section renders from `roles` (default `[]` while loading):

```tsx
{(roles ?? []).length > 0 ? (
  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {(roles ?? []).map((job) => (
      <JobCard key={job.id} job={job} />
    ))}
  </div>
) : (
  <p className="mt-4 text-muted-foreground">No open roles right now — check back soon.</p>
)}
```

- [ ] **Step 5: Re-point `src/components/jobs/apply-modal.tsx`**

Change only the type import: `import type { JobWithCompany } from '@/lib/services'` (the `applyToJob` import stays on `@/lib/mock/services` until Slice 3).

- [ ] **Step 6: Run tests + typecheck + full suite — expect PASS**

Run: `npx vitest run src/pages/public`, `npm run typecheck`, `npm run test`.

- [ ] **Step 7: Commit**

```bash
git add src/pages/public/job-detail.tsx src/pages/public/company-profile.tsx src/components/jobs/apply-modal.tsx src/pages/public/__tests__
git commit -m "feat(browse): job detail and company profile on real API"
```

---

### Task 8: Live e2e against staging + DoD sweep

**Files:** none created — verification only (plus push).

- [ ] **Step 1: Start both servers**

```bash
# backend (sibling repo, already on staging):
cd C:/Users/almos/Projects/Job-Board-API-only && uv run python manage.py runserver
# frontend (this repo):
npm run dev
```

Postgres service `postgresql-x64-18` must be running. If the dev DB has fewer than ~3 published jobs or ~2 named companies, seed a few via `uv run python manage.py shell` (create `JobPost` rows for the existing companies with varied `salary_max`, one with null salaries, one with a null deadline, and a couple of `JobPostSkillSet` rows) so every filter has something to bite on.

- [ ] **Step 2: Anonymous browse checklist (Playwright/Chrome MCP, logged out)**

- `/jobs`: cards show employer names; count headline matches; type/category selects populated from the API; each filter (keyword incl. a skill name, type, category, min salary) narrows results; "Highest salary" puts salary-less roles last; pagination works; typing in the keyword box fires ~1 request after the pause (not per keystroke — watch the network panel); changing a filter does not flash skeletons.
- `/jobs/:id`: skills chips with level + Required badge; company link navigates; null-deadline job shows no "Apply by"; "Log in to apply" for guests.
- `/companies`: cards with open-role counts; no blank-named stub rows; search + category filter work.
- `/companies/:id`: header, stream badge, website link (no doubled protocol), gallery images, open roles as cards.
- Landing: featured roles show company names; exactly one job-posts request.

- [ ] **Step 3: Authenticated + regression checklist**

- Log in as the seeker; browse `/jobs` and a job detail — data loads, no 401 loops, apply CTA switches to "Apply now" (modal still mock — do not submit).
- Seeker dashboard and company console screens still render (mock data, unchanged).
- `npm run test` and `npm run typecheck` both green one final time.

- [ ] **Step 4: Push**

```bash
git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin feat/frontend
```

---

## Self-review notes (done at plan time)

- **Spec coverage:** §4.1→Tasks 1/2/5, §4.2→Task 1, §4.3/§4.4→Tasks 3–5, §5 pages→Tasks 2/6/7, §6 UX→Task 6 (debounce, keepPreviousData) + Task 3 (meta cache), §7 testing→every task + Task 8, §8 DoD→Task 8.
- **Spec §5.7 (format.ts widening) needs NO task:** `formatDate` already accepts `string | null | undefined` (returns '—') and `money` already takes `SalaryType | null` — verified in the current file. The nullable view-model fields therefore compile everywhere without touching `format.ts` or any mock-served screen.
- Type names cross-checked: `JobWithCompany`/`CompanyListItem`/`JobFilters` (Task 1) are what Tasks 4–7 import; fixture names (Task 2) match Tasks 3–7 usage; `_resetMetaForTests` used in every services/page test that touches meta.
- The `salaryType: SalaryType | ''` DTO vs `SalaryType | null` view model conversion happens in exactly one place (`adaptJob`).
