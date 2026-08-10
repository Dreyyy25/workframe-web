# Slice 4 — Company Console on Real Data (Design)

**Date:** 2026-08-10
**Status:** Approved (design conversation 2026-08-10)
**Repos:** `workframe-web` (frontend) + `Job-Board-API-only` (backend, sibling repo)
**Predecessors:** Slice 1 (auth), Slice 2 (public browse), Slice 3 (seeker) — all merged to `staging` in both repos.

## 1. Goal

Move the six company-console pages (dashboard, job posts list, post/edit job, applicants list, applicant detail, company profile) off the in-memory mock backend onto the real Django API, then delete the mock layer entirely — it has no other consumers left. Close the backend contract gaps and permission bugs the console builds on.

This is the final slice of the backend-integration roadmap (spec `2026-07-01-backend-integration-design.md` §Slice 4).

## 2. Decisions locked with the user (2026-08-10)

1. **Applicant identity:** the application payload gains the applicant's *name* inline; the applicant-detail page joins the seeker's full dashboard (already company-readable). **Email stays hidden from companies** — contact happens via the seeker's contact details / resume link.
2. **Company.status:** owners may self-serve `active`/`inactive`; `suspended` is admin-only in both directions (an owner can neither set it nor leave it).
3. **Job skills:** free-text get-or-create by name for companies — the exact pattern seekers got in Slice 3.
4. **Dashboard stats:** computed server-side in the existing company-dashboard endpoint.
5. **Delivery:** one slice, three PRs — PR 0 (Modal autofocus fix, frontend), backend PR, frontend PR. Subagent-driven implementation.

## 3. Backend changes (one PR, worktree off `staging`, TDD)

No model changes → no migrations. All changes are serializer/view/permission level. The seeker-facing contract only gains fields; nothing it consumes changes shape.

### B1. Applicant name on application reads

`JobPostActivityReadSerializer` gains a read-only nested field:

```json
"applicant": {"id": "<user-account uuid>", "first_name": "…", "last_name": "…"}
```

- Sourced from the seeker profile joined via `user_account` (profile PK **is** the user-account id, so `applicant.id == user_account`).
- If the profile row is missing (defensive; signals normally auto-create it), `applicant` is `null`.
- `user_account` (bare UUID) stays exactly as-is — the Slice 3 frontend contract is untouched.
- `JobPostActivityQuerySet.with_related` (`apps/jobs/managers.py`; attached to the model via `.as_manager()` — there is no separate manager class) extends to `select_related` the seeker profile so the existing query-count tests stay flat (update the pinned counts only if the join itself adds a query).
- The whole-shape assertion test (`apps/jobs/tests.py` nested-read tests) is updated to pin the new key.

### B2. Company dashboard stats

`build_company_dashboard` (`apps/companies/services.py`) adds a third key:

```json
"stats": {"active_posts": N, "total_applications": N, "new_this_week": N}
```

- `active_posts` — the company's job posts with `is_published=True AND is_active=True`.
- `total_applications` — all `JobPostActivity` rows across the company's jobs.
- `new_this_week` — subset with `application_date >= now() - 7 days` (rolling window, server clock, UTC).
- Inline OpenAPI schema in `apps/companies/views.py` updated to match.

### B3. Company status rules

In `CompanySerializer` (request in context):

- Non-admin owner may set `status` only to `active` or `inactive`.
- If the instance's current status is `suspended`, a non-admin PATCH that includes `status` with a *different* value → 400. Same-value writes are a no-op and pass (mirrors the application-status rule).
- Other fields remain editable while suspended — suspension freezes visibility, not profile upkeep.
- Staff/superuser unrestricted.

### B4. Job-skills get-or-create + ownership

`JobPostSkillSetSerializer` / `JobPostSkillSetViewSet`:

- Create accepts **either** `skill_set` (existing UUID) **or** `skill_name` (string) — exactly one required. `skill_name` is case-insensitively get-or-created against `SkillSet` (mirroring the Slice 3 seeker pattern in `apps/seekers/serializers.py`).
- **Load-bearing difference from the seeker serializer:** there, DRF's auto-attached `UniqueTogetherValidator` is implicitly dropped because `user_account` is read-only. Here **both** `unique_together` fields (`job_post`, `skill_set`) are writable, so the validator attaches from `Meta.unique_together` — and once `skill_set` becomes optional, its `enforce_required_fields` would 400 every `skill_name`-only create with `"skill_set: This field is required."`. The serializer must **explicitly drop the auto validator** (`Meta.validators = []`) and enforce uniqueness manually in `validate()`.
- Duplicate skill on the same job post → 400 `"This skill is already on the job post."` (the manual check replacing the validator's generic message).
- **Create is owner-scoped:** the target `job_post` must belong to the caller's company; otherwise 403. Staff/superuser exempt. (Closes the any-authenticated-user hole.)
- `job_post` becomes immutable on update — PATCH may change only `skill_level` / `is_required`.

### B5. Applications inbox filters + ordering

`JobPostActivityViewSet`:

- `filterset_fields = ['job_post', 'application_status']`.
- `ordering_fields = ['application_date', 'updated_at']`. The model's `Meta.ordering = ['-application_date']` **already** makes the list deterministically newest-first — no default-ordering change is needed (a "missing ordering" red test would pass before any change). B5's only work is the two view attributes above; the global `DEFAULT_FILTER_BACKENDS` already attach `DjangoFilterBackend` + `OrderingFilter`.
- Applies to every role's list (a seeker can filter their own applications too — harmless).

### B6. Draft-retrieve permission fix

`IsJobPosterOrAdmin.has_object_permission` currently returns `obj.is_published` for safe methods *before* the owner/admin branches — the owning company can list its draft but gets 403 retrieving it, which breaks the edit-a-draft flow.

- Fix: safe methods pass when `obj.is_published` **or** requester is staff/superuser **or** requester owns the post (guard the anonymous case).
- Same fix in `CanManageJobSkills.has_object_permission` (safe → published or admin or owner).
- Tests: owner GETs own draft → 200; anonymous GET of a draft → 404 (queryset already excludes it); non-owner company → 404.

### B7. Company-images ownership

`CompanyImagesViewSet` / `CompanyImagesSerializer`:

- `company` becomes read-only; `perform_create` derives it from `request.user`'s company profile.
- Create requires `user_type == 'company'` → otherwise 403. (Closes the attach-an-image-to-any-company hole.)
- Admins manage images via Django admin (the API create path is company-only).
- Object-level delete scoping already correct (owner or admin) — pinned with a test.

### B8. Company users see the whole public jobs board

`JobPostViewSet.get_queryset` currently narrows *any* company user to their own posts — a logged-in company browsing the public `/jobs` page sees only itself.

- Fix: for company users the queryset becomes **published ∪ own** (`Q(is_published=True, is_active=True) | Q(company__user_account=user)`).
- Console "my jobs" then uses the explicit `?company=<companyId>` filter (which already exists) — list semantics become role-independent.
- No draft leak: other companies' unpublished posts stay outside the queryset; B6 governs object access.
- The union's own-arm intentionally carries drafts (the console depends on it) — so without more, a company browsing the *public* board would see its own drafts and deactivated posts mixed in. To keep the public view clean: `JobPostFilter` gains `is_active` (one Meta field; `is_published` already exists), and the frontend's **public-browse** calls (`listJobs`, `listCompanyRoles`) pass `is_published=true&is_active=true` explicitly (a no-op for anonymous/seeker sessions, filters the union for company sessions). **Console** calls send no publish filters and keep the drafts.

### Backend verification

Ruff clean, no new migrations (`makemigrations --check`), OpenAPI schema regenerates without warnings, full suite green (474 existing + new tests). Same CI gate (`ci`) as always; PR into `staging`, never merged by Claude.

## 4. Frontend architecture

Follows the Slice 2/3 layering exactly: `src/lib/api/*` = typed transport (DTOs in `api/types.ts`), `src/lib/services/*` = view-model adapters the pages consume, TanStack Query in the pages.

### PR 0 — Modal autofocus fix (own branch off `staging`, lands first)

`src/components/ui/modal.tsx` focuses `panelRef.querySelector('input, textarea, select, button')` ~30 ms after mount; the header Close button precedes `{children}` in the DOM, so it always wins and can steal focus mid-typing.

- Fix: scope the autofocus query to the modal *content* container (the wrapper that renders `{children}`), falling back to the panel itself when the content has no focusable element.
- Delete the `settleAutofocus` workaround in `src/components/jobs/__tests__/apply-modal.test.tsx` and assert the real behavior (first form field focused).
- PR 0 lands before console work begins; the slice branch then merges `staging` so the console builds on the fixed modal.

### New API modules

`src/lib/api/companies.ts`:

| Function | Endpoint |
|---|---|
| `getCompanyDashboard(userId)` | `GET /companies/dashboard/{userId}/` (moves the raw call out of `session.ts`; `session.ts` imports it) |
| `patchCompanyProfile(companyId, body)` | `PATCH /companies/profile/{companyId}/` |
| `postCompanyImage(body)` | `POST /companies/company-images/` (`{image_url}`) |
| `deleteCompanyImage(imageId)` | `DELETE /companies/company-images/{imageId}/` |

`src/lib/api/jobs.ts`:

| Function | Endpoint |
|---|---|
| `postJobPost(body)` / `patchJobPost(id, body)` / `deleteJobPost(id)` | `/jobs/job-posts/` |
| `postJobLocation(body)` | `POST /jobs/job-locations/` (`{city, country}`) |
| `postJobSkill(body)` / `patchJobSkill(id, body)` / `deleteJobSkill(id)` | `/jobs/job-skills/` |

`src/lib/api/applications.ts`: `getApplications(params?)` gains optional `{job_post, application_status}` passthrough (unused by pages for now — see §5 Applicants).

`src/lib/api/types.ts`: `CompanyDashboard` gains `stats`; `ApplicationReadDto` gains `applicant: {id, first_name, last_name} | null`; job-post write body type added.

### New service module — `src/lib/services/company.ts`

View models live in `src/lib/services/types.ts`; everything exported through the barrel.

- `getCompanyConsole()` — composite (the `seeker.ts` pattern **plus a meta join**): `getMe()` → `getCompanyDashboard(me.id)`, then resolve `streamName` from the streams meta cache — the dashboard serializes `business_stream` as a **bare UUID** (no nested stream), so `src/lib/services/meta.ts` gains `listStreamOptions(): Promise<{id, name}[]>` (the cached fetch already holds the pairs; `listStreams()` keeps its names-only shape for public browse) and the composite joins id→name (unresolvable → `streamName: null`). Flat view: `{companyId, name, streamId, streamName, status, website (raw), description, images: [{id, url}], stats: {activePosts, totalApplicants, newThisWeek}}`. Single query key **`['company-console']`** feeds the dashboard *and* the profile page.
- `updateCompanyProfile(companyId, patch)` — PATCH mapping `{name→company_name, streamId→business_stream, status, website→company_website_url, description→profile_description}`. Pages pass `companyId` from the loaded console view (no hidden refetch).
- `addCompanyImage(url)` / `removeCompanyImage(imageId)` — removal is **by image id** now (the mock removed by URL string).
- `listCompanyJobs(companyId)` — `getJobPosts({company: companyId, page_size: 100})` → rows `{id, title, type, city, country, salaryMin, salaryMax, salaryType, deadline, published, active, posted}`. Includes drafts (owner queryset).
- `getCompanyJob(id)` — full detail for the edit form, including `skillRows: [{id, skillId, name, level, required}]` adapted from `required_skills`.
- `saveJob(input, existing?)` — composite create/edit (see §5 Post-job).
- `setJobPublished(id, published)` / `deleteJob(id)`.
- `listCompanyApplicants` — **not a new function**: the existing `listApplications()` / shared `['applications']` cache is reused; `adaptApplication` extends the `Application` view model with `applicant: {id, name} | null` (name = `first_name + last_name` trimmed, `null`/blank → UI fallback). Server-side scoping already returns the company's inbox for company users.
- `getApplicantDetail(applicationId)` — composite: `getApplicationById(id)` → `getSeekerDashboard(dto.user_account)` → `{application fields, applicantName, goals, contactDetails, resumeUrl, skills: [{name, level}], experience: [...], education: [...]}`.
- `setApplicantStatus(applicationId, status)` — `patchApplicationStatus` with `'reviewed' | 'accepted' | 'rejected'`.

### Auth/session touch-ups

- `session.ts` reuses `api/companies.getCompanyDashboard` instead of its inline `apiGet` (behavior unchanged: name from `dashboard.company.company_name`, email fallback).
- `AuthValue` interface exported from `auth-context.tsx` (Slice 3 backlog item).
- No `SessionUser` shape change — services derive `companyId` themselves via the console composite.

## 5. Page-by-page behavior

All six pages keep their layout and Bold-Editorial styling; only the data seam changes. Query-key conventions follow Slice 3 (`['company-console']`, `['company-jobs']`, `['company-job', id]`, shared `['applications']`, `['application-detail', id]`).

- **Dashboard** — stats from `['company-console']`; recent applicants = shared `['applications']` sorted by `applied` desc, top 5, showing applicant name (fallback `"Applicant"`), job title, date, status badge; row links to `/company/applicants/{applicationId}`.
- **Job posts list** — `['company-jobs']` via `listCompanyJobs(companyId)` (`companyId` from the console query; the page composes both queries). **Per-job applicant counts are derived client-side** from the shared `['applications']` cache (group by `jobId`) — accepted cap at `page_size: 100`, the same trade-off Slice 3 accepted. Publish toggle → `setJobPublished` (PATCH `is_published`), Delete → `deleteJob`; both invalidate `['company-jobs']` + `['company-console']`; delete also invalidates `['applications']` (cascade).
- **Post/edit job** — job-type select from real `listJobTypes()` (meta cache); salary type gains a "Not specified" option; deadline optional; the `TODO(slice-4)` fallbacks are removed — real nulls flow to the form boundary. **Wire encoding is asymmetric:** the view model uses `null` for both unset values, but `salary_type` is a non-nullable blank `CharField` — it round-trips as `''` on the wire (sending `null` is a 400) — while `deadline_date` round-trips as real `null`. The adapter owns this mapping; the write body type is `salary_type: SalaryType | ''`. Salaries go as numbers, empty → `null`. **City and country become required form fields** (the backend requires both non-blank); the mock's `country || '—'` write fallback is deleted. "Publish immediately" checkbox ↔ `is_published`. Edit mode loads `['company-job', id]` (drafts load thanks to B6). Persisted skill rows render their **name read-only** (level/required stay editable) — renaming a skill means removing the row and adding a new one, so the skill diff is keyed purely by row id.
  **`saveJob` composite:**
  - *Create:* `postJobLocation({city, country})` → `postJobPost({job_title, job_description, job_type, job_location, salary_min, salary_max, salary_type, deadline_date, is_published})` → `postJobSkill({job_post, skill_name, skill_level, is_required})` per row.
  - *Edit:* new location only when city/country changed (locations are create-only for companies; row growth accepted); PATCH the changed post fields; skills **diffed by row id** — rows without an id POST by `skill_name`, absent ids DELETE, level/required changes PATCH.
  - *Invalidations on success:* `['company-jobs']`, `['company-console']`, and (edit) `['company-job', id]`. The mock's `['company-stats']` key is dead — `['company-console']` replaces it.
  - *Partial failure* (post saved, a location/skill call fails): run the **same invalidations** — the post exists, and refetching `['company-job', id]` re-syncs `skillRows` so a retry re-diffs against server truth instead of re-POSTing already-created skills into B4's duplicate 400. In create mode, navigate to the job's edit page; in edit mode, stay put. Error toast either way.
  - API 400s — from the job-post call *and* the location call (city/country) — map to inline field errors via `ApiError.fieldErrors` (Slice 1 pattern).
- **Applicants list** — job-filter select built from `['company-jobs']`; the list **client-filters the shared `['applications']` cache** by the `?job=` search param (one fetch shared with dashboard/jobs; the backend `?job_post=` filter exists for when volume outgrows this). Card shows applicant name, job-title badge, applied date, status badge — the mock's "title · N yrs" line is dropped from the list (that data now lives on the detail page). Accept/Reject buttons follow the transition matrix; a withdrawn application shows its badge with no actions.
- **Applicant detail** — `['application-detail', id]` composite. Shows: applicant name, status badge + status actions (Mark reviewed when `pending`; Accept/Reject when `pending` or `reviewed`; nothing when terminal/withdrawn), link to the job, **contact details + resume link** (replacing the mock's email — email is never available), goals, skills chips (with level), experience entries (title, company, dates), education entries (degree, institution, dates), cover letter. Mutations invalidate `['application-detail', id]` + `['applications']`. If the seeker-dashboard fetch 404s (profile deleted) while the application itself loaded, the composite returns the application portion with the profile fields `null` — the page keeps the status actions, shows the name fallback, and renders an empty-state note for the profile sections (the same defensive case B1 covers with `applicant: null`).
- **Company profile** — form binds to `['company-console']`: name, business-stream select from the meta stream options (`listStreamOptions()`, option value = stream **id**), website, description. Status renders as an **Active/Inactive toggle**; when status is `suspended` the toggle is replaced by a "Suspended by admin" badge + explanatory note (other fields stay editable, matching B3). Image gallery: add via the existing URL-input modal (`postCompanyImage`), remove by image id; both invalidate `['company-console']`. A successful profile save also calls `void refreshUser()` (the Slice 3 pattern) — the session display name **is** the company name, so a rename must reach the topbar without a reload.
- **Console layout** — topbar fallback `'Northwind Labs'` → the user's name with a neutral `'Your company'` fallback.

## 6. Mock layer deletion & type cleanup

After the six pages convert, nothing imports `src/lib/mock/` — **delete the directory** (`services.ts`, `data.ts`, `store.ts`, `types.ts` shim).

Re-pointing (the Slice 3 backlog list, now due):

- `UserType` (`'job_seeker' | 'company'`) moves to `src/lib/services/types.ts`; `session.ts`, `require-auth.tsx`, `register.tsx` re-point.
- `status-badge.tsx` imports `AppStatus` from `@/lib/services`.
- Company pages import `AppStatus`, `Company`, `CompanyStatus`, `JobSkill`, `SalaryType`, `SkillLevel` from `@/lib/services`.
- `ENUMS` / `JOB_TYPES` / `BUSINESS_STREAMS` constants from `mock/data.ts`: form option lists that survive (`salaryType`, `skillLevel`, `sex`, `degreeType`) move to a real home — `src/lib/services/enums.ts` — and `settings.tsx` + `seeker/profile.tsx` + the company forms re-point. `JOB_TYPES` and `BUSINESS_STREAMS` die (real API lists). `companyStatus` dies (toggle, not a select).
- `AuthValue` exported (see §4).

`npm run typecheck` is the proof the deletion is complete.

## 7. Testing & Definition of Done

**Backend:** TDD per change; every new behavior pinned (applicant nesting whole-shape, stats math incl. the 7-day boundary, status matrix for owner/admin/suspended, skill get-or-create + duplicate + ownership 403, inbox filters, draft retrieve, image ownership, company-queryset union). Full suite + query-count guards green; schema validates.

**Frontend:** MSW handlers extended to mirror the TDD-verified shapes (dashboard stats, applicant nesting, company writes, job/skill/location writes — all behind `denyUnlessAuthed`); tests per console page (data rendering, mutation + invalidation, transition-matrix button states, suspended-profile mode, partial-failure toast); adapter unit tests (console flattening incl. the stream id→name join, skill diffing by row id, and the unset-value wire asymmetry — `salary_type` `''` vs `deadline_date` `null`). Typecheck clean; suite green (Slice 3 baseline: 140 tests — expected to grow substantially).

**Live e2e checklist (both servers, real browser):**

1. Register a company → lands on console dashboard; name in topbar.
2. Complete profile (name, stream, website, description) → public directory reflects it.
3. Add an image by URL → gallery + public company detail show it; remove works.
4. Post a job with brand-new skill names, salary, deadline, published → console list + public jobs board.
5. Create a draft (publish unchecked) → absent from the public board — verify from an anonymous or seeker session, **and** confirm the company's own public browse hides it too (the `is_published=true&is_active=true` params, B8); **edit the draft** (B6), publish → appears.
6. Seeker (existing account) applies → dashboard stats tick up; recent applicants shows the name.
7. Applicants list, filter by job; open detail → name, contact details, resume link, skills, cover letter.
8. Transitions: pending → reviewed → accepted; buttons disable per matrix; the seeker sees the new status.
9. Toggle company inactive → gone from public directory (its published jobs remain on the jobs board — accepted, see §8); re-activate → back.
10. As the logged-in company, browse public `/jobs` → all published jobs visible, not just its own (B8).
11. Delete a job → gone from console + public; applicant count updates.
12. Regression: seeker area + public browse behave exactly as before; both suites + typecheck green.

## 8. Out of scope / accepted limitations

- **AI endpoints** (job-post assist, applicant screening) — exist on the backend, not surfaced in this slice.
- **File uploads** — images remain URL strings end-to-end (matches backend model and existing UI).
- **`contact_email` UI** — field exists on the backend but nothing public displays it; deferred.
- **Company self-delete** (`DELETE /companies/profile/{id}/` cascades) — left as-is, noted.
- **Email exposure to companies** — deliberately never; contact details/resume are the channel.
- **Applicant-count / applications cap at page size 100** — accepted, consistent with Slice 3; backend filters (B5) are the escape hatch when volume demands server-side pagination UX.
- **JobLocation row growth** — accepted; locations are create-only for companies by design.
- **Inactive company's published jobs stay on the public board** — the job queryset never checks company status, so pausing a company hides its directory entry (and its detail page 404s) while its published jobs remain listed with a dangling company link. Pre-existing backend behavior, surfaced now that inactive is one click; accepted for this slice.
- **Companies-list pagination + stub sorting polish** (public browse) — stays on the backlog.
- **Company AI chat** — does not exist server-side; not created.

## 9. Delivery mechanics

- **PR 0** (frontend): `fix/modal-autofocus` off `staging` → PR → user merges. The slice branch (`feat/slice4-company`, already carrying this spec) merges `staging` after PR 0 lands.
- **Backend PR:** worktree off `staging` in the sibling repo (`backend-work-directly` rule: Claude implements, PRs, never merges).
- **Frontend PR:** `feat/slice4-company` off `staging` (this spec commits on it).
- Conventional commits, **no Claude attribution trailer** (repo rule). Required `ci` check on both repos; push via the `gh`-credential helper incantation.
- Subagent-driven implementation with per-task independent review, final whole-branch review + fix wave — the Slice 3 playbook.
