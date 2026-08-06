# Slice 2 — Public Browse on Real Data (design)

- **Date:** 2026-08-06
- **Repo:** `workframe-web` (frontend). Backend prerequisites already landed on `Job-Board-API-only` `staging` @ `5c57450` per `docs/superpowers/plans/2026-08-04-slice2-public-browse-backend-handoff.md` — verified 2026-08-06 (adversarial review, all six sections implemented; backend suite 449 tests green).
- **Parent roadmap:** `docs/superpowers/specs/2026-07-01-backend-integration-design.md` §5, Slice 2.

## 1. Goal

The public browse surfaces — **Jobs list, Job detail, Companies list, Company profile**, plus the landing page's featured roles — render real backend data for anonymous and authenticated users. The mock seam for these pages is replaced by a real services layer; every other screen (seeker, company console, settings) stays on mocks until Slices 3–4.

**Non-goals:** apply flow and `hasApplied` (Slice 3 — stays mock), company console (Slice 4), any backend change (already shipped), SEO/SSR, companies-list pagination UI (the list fetches the API's `page_size=100` cap in one request — plenty at current scale; see §4.3).

## 2. Verified backend contract (what we consume)

Full reference lives in the handoff doc; the facts that shape this design:

- **Envelope:** every list is paginated `{count, next, previous, results}`; `page`/`page_size` params, `page_size` ≤ 100, default 20.
- **`GET /jobs/job-posts/`** (anon → published+active only) returns the **nested read shape**: `company: {id, company_name, business_stream: {id, business_stream_name}}` (id = Company id), `job_type: {id, job_type_name}`, `job_location: {id, city, country, …}`, `required_skills: [{id, skill_set: {id, skill_name}, skill_level, is_required}]`.
- **Serialization quirks:** `salary_min`/`salary_max` are **decimal strings** (`"120000.00"`) or `null`; `salary_type` may be `""` (never null); `deadline_date` may be `null`; `job_description_hidden` is *absent* for non-owners.
- **Filters:** `search` (title, description, company name, skill names), `job_type` (UUID), `business_stream` (UUID), `salary_floor` (`COALESCE(salary_max, salary_min) >= X`), `company` (UUID), `ordering` (`-created_at` default; use **only** `-salary_rank` for the salary sort — ascending `salary_rank` would put salary-less jobs first).
- **`GET /companies/public/`** (anon) → active companies with `business_stream` nested and `open_roles_count` (published+active posts); **retrieve** adds `images: [{id, image_url, created_at}]`. Fixed alphabetical order; `search` + `business_stream` filters; no `ordering` param. `contact_email`/`user_account` excluded.
- **Stub rows:** register auto-creates company profiles as `status='active'` with `company_name=''` / stream "Uncategorized"; these appear in the public list and must be hidden client-side.
- **Throttle:** anonymous 300/hour (+1000/day per IP) — a real constraint on per-keystroke fetching (§7).
- Meta lists `GET /jobs/job-types/` and `GET /companies/business-streams/` are anonymous and paginated.

## 3. Decisions (approved 2026-08-06)

1. **New `src/lib/services/` module** owns the real implementations and the public view-model types. The four public pages, `job-card`, and `apply-modal` re-point their imports; `src/lib/mock/` stays intact for the remaining screens (the seeker dashboard still imports mock `listJobs` — untouched).
2. **Companies list drops `openRoles: Job[]` for `openRolesCount: number`** (backend annotation). The company profile page fetches its roles with a second query (`/jobs/job-posts/?company={id}`). No N+1 on the list.
3. **Filter URLs keep human-readable names** (`?type=Full-time&stream=Software`). The services layer resolves names → UUIDs through the cached meta lists; an unknown name yields an empty result without an API call (mock parity).

## 4. Architecture

### 4.1 Module layout

```
src/lib/services/
  types.ts      ← public view models: Job, JobSkill, JobWithCompany, CompanyRef,
                  Company, CompanyListItem, JobFilters (single source of truth)
  meta.ts       ← listJobTypes() / listStreams() + name→UUID resolution
                  (module-level single-flight caches over api/public)
  jobs.ts       ← listJobs, getJob, listCompanyRoles + job adapter
  companies.ts  ← listCompanies, getCompany + company adapter
  index.ts      ← re-exports: pages import only '@/lib/services'
```

- `src/lib/mock/types.ts` re-imports `Job`, `JobSkill`, `Company` (and their dependents) from `services/types.ts` instead of defining them, so there is exactly one definition and mock data keeps compiling. `mock/services.ts` re-exports `JobWithCompany` for its remaining consumers.
- `src/lib/api/types.ts`: `JobPost` is **rewritten** to the nested read shape (with `JobPostCompanyRef`, `JobTypeRef`, `RequiredSkill` DTOs — DTO names stay distinct from the `CompanyRef` view model); `PublicCompany` / `PublicCompanyDetail` added. `src/lib/api/public.ts` gains `getPublicCompanies` / `getPublicCompany`; `getJobLocations` is deleted (its only consumer was the landing join, which dies in §6.5).

### 4.2 View-model deltas (vs. mock)

Shapes stay screen-compatible; three deliberate changes:

| Field | Was (mock) | Now | Why |
|---|---|---|---|
| `JobWithCompany.company` | full `Company` | `CompanyRef {id, name}` | pages only use id/name; mock's full object still satisfies the ref structurally |
| `Job.deadline` | `string` | `string \| null` | backend nullable; job-detail renders the deadline badge/row conditionally |
| `Job.salaryType` | `SalaryType` | `SalaryType \| null` | backend can return `""`; adapter maps `""` → null, `money()` tolerates it |
| `CompanyWithRoles` | `openRoles: Job[]` | `CompanyListItem = Company & {openRolesCount}` | decision 2 |

### 4.3 Function contracts

All return Promises; errors other than 404 propagate as `ApiError` to TanStack Query.

- `listJobTypes(): Promise<string[]>`, `listStreams(): Promise<string[]>` — names for the selects, from the cached meta fetches (`page_size=100`).
- `listJobs(filters: JobFilters): Promise<{results: JobWithCompany[]; count: number}>` — param mapping: `search`→`search`, `type` name→`job_type` UUID, `stream` name→`business_stream` UUID, `minSalary`→`salary_floor`, `sort: 'newest'`→`ordering=-created_at`, `'salary'`→`ordering=-salary_rank`, `page`→`page`, `pageSize`→`page_size`. Unknown type/stream name → `{results: [], count: 0}` (no request).
- `getJob(id): Promise<JobWithCompany | undefined>` — 404 (incl. malformed id) → `undefined`; pages keep their "Role not found" state.
- `listCompanies({search, stream}): Promise<CompanyListItem[]>` — `page_size=100`, blank-named stub rows filtered out, unknown stream name → `[]`.
- `getCompany(id): Promise<Company | undefined>` — retrieve with images; 404 → `undefined`.
- `listCompanyRoles(companyId): Promise<JobWithCompany[]>` — `/jobs/job-posts/?company={id}&page_size=100` (named to avoid colliding with mock's company-console `listCompanyJobs`).

### 4.4 Adapter mappings

**JobPost DTO → Job / JobWithCompany:** `job_title`→`title`; `job_type.job_type_name`→`type`; `job_location.city/country`→`city`/`country`; `salary_min/max` string→`Number()`, null→null; `salary_type` `""`→null; `deadline_date`→`deadline`; `created_at`→`posted` (date part); `is_published`→`published`; `required_skills[]`→`skills[] {name: skill_set.skill_name, level: skill_level, required: is_required}`; `job_description`→`description`; `company {id, company_name}`→`companyId` + `company: {id, name}`.

**PublicCompany DTO → Company / CompanyListItem:** `company_name`→`name`; `business_stream.business_stream_name`→`stream`; `company_website_url`→`website` **with protocol stripped** (`https?://` prefix removed — the profile page renders `href={'https://' + website}`, and the backend stores full URLs; without stripping we'd emit `https://https://…`); `profile_description`→`description`; `images[].image_url`→`images` (list items get `[]`); `logo` = derived initials (first letters of up to two words, uppercased); `open_roles_count`→`openRolesCount`.

## 5. Page & component changes

1. **`jobs.tsx`** — import path; debounced search (§7).
2. **`job-detail.tsx`** — import path (`getJob` from services; `hasApplied` **stays** on mock); conditional deadline badge + sidebar row when `deadline` is null.
3. **`companies.tsx`** — import path; `.openRoles.length` → `.openRolesCount`; debounced search.
4. **`company-profile.tsx`** — import path; open roles become a second query (`listCompanyRoles(id)`), cards get `job={job}` directly (roles already carry the company ref).
5. **`featured-jobs.tsx` (landing)** — the three-fetch client-side join (`getJobPosts` + `getJobTypes` + `getJobLocations`) collapses to a single `getJobPosts` call reading the nested fields, and the card gains the company name (UI already renders it when present). Seed fallback (`SEED_FEATURED`) behavior unchanged.
6. **`job-card.tsx` / `apply-modal.tsx`** — type import re-pointed to `@/lib/services`; no behavior change.
7. **`format.ts`** — `formatDate` (and `money`'s type argument) widened to tolerate `null` (render `''` / omit the suffix). This is what lets the §4.2 nullable types flow through *without editing any mock-served screen*: mock data never contains nulls, so those screens keep compiling and rendering identically.

## 6. UX resilience (new needs — mock was instant and unmetered)

- **Debounce the search inputs** on jobs + companies (~350 ms) before they reach the query key. Per-keystroke fetching would hammer the 300/hour anonymous throttle (each jobs-page change costs up to 1 request; typing a 20-char query would burn 20).
- **`placeholderData: keepPreviousData`** on the jobs/companies list queries so filter changes don't flash skeletons — previous results stay visible while the next page loads (skeletons still show on first load).
- **Meta lists cache:** module-level single-flight promise in `meta.ts` + `staleTime: Infinity` on their queries — reference data, fetched once per session, shared by selects and name-resolution.
- **Errors:** 404 → existing not-found states. Other failures (throttle 429, network) land in the pages' existing empty states — accepted for this slice; a dedicated error state is deferred.
- Logged-in browsing reuses the Slice-1 client: Bearer attached when a session exists, silent refresh + retry already handled; anonymous requests carry no auth header.

## 7. Testing

- **MSW (staging-shaped):** new handlers + fixtures mirroring §2 exactly — decimal-string salaries, `""` salary_type, nested skills, pagination envelope, companies public list/retrieve (incl. one blank-named stub company), meta lists. Handlers capture request params for assertion.
- **Unit (Vitest):** adapters (decimal parsing, null/`""` normalization, website protocol strip, initials, skills mapping); name→UUID resolution incl. unknown-name → empty *without* a request (spy on handler); `listJobs` param mapping incl. both sort orders; 404 → `undefined`; stub-company filtering.
- **Page integration (RTL + MSW):** one per page — render with route params, assert real fixtures appear and the outgoing query string matches the filter state (jobs: search/type/stream/minSalary/sort/page; companies: search/stream; profile: roles + images; landing: single-request featured load).
- **Manual e2e vs. staging backend** (backend repo is checked out on `staging`; `uv run python manage.py runserver` there + `npm run dev` here): anonymous browse of all four pages + landing, every filter/sort control, pagination, job detail with skills/company link, company profile with images + roles, blank-stub absence, logged-in browse unaffected, no 429 during normal use.
- Existing 63 tests stay green; `npm run typecheck` clean.

## 8. Definition of done

- [ ] All four public pages + landing render staging data anonymously; filters, sort, and pagination behave per §4.3 against the real API.
- [ ] Mock-served screens (seeker/company/settings) untouched and functional.
- [ ] View-model changes limited to §4.2; no other page-visible shape drift.
- [ ] Search debounced; filter changes keep previous results (no skeleton flash); blank stub companies never render.
- [ ] `npm run test` (existing + new) and `npm run typecheck` green.
- [ ] Conventional commits per task; no Claude attribution trailer.
