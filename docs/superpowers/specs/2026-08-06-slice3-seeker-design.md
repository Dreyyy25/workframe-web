# Slice 3 — Seeker Area on Real Data (design)

- **Date:** 2026-08-06
- **Repos:** `workframe-web` (frontend, branch `feat/slice3-seeker` off `staging`) **and** `Job-Board-API-only` (backend, branch `feat/seeker-applications` off `staging`, built in a **git worktree** — the main backend checkout stays untouched). Both land via PR into their `staging` with the required `ci` check; **no direct merges**.
- **Parent roadmap:** `docs/superpowers/specs/2026-07-01-backend-integration-design.md` §5, Slice 3.

## 1. Goal

The seeker area — dashboard, applications list, application detail, profile (education / experience / skills), settings — and the apply flow run on real backend data for the authenticated seeker. This slice also folds in the deferred Slice-2 cleanup items and the anonymous-401 console-noise polish.

**Non-goals:** company console (Slice 4), email change (read-only this slice — no verification infra), file uploads (resume/photo stay URL strings), applications pagination UI (fetch `page_size=100`), AI features, "log out other devices" on password change.

## 2. Verified current state (exploration 2026-08-06, staging)

**Works today:** `GET /seekers/dashboard/{user_id}/` returns `{profile, education, experience, skills}` unpaginated for the owner; education/experience CRUD with server-side date/percentage validation; `POST /jobs/apply/` with seeker-only / published-only / duplicate / self-only validations (403/404/400 `{error}` shapes, 201 `{message, data}`); `PATCH /accounts/users/{id}/` self-service (hashes password on update); seeker profile auto-created at registration (`POST /profiles/` always 400 — use PATCH).

**Gaps this slice fixes (backend §4):**
- `JobPostActivitySerializer` and `SeekerSkillSetSerializer` return **bare UUID FKs** — applications can't render job/company, skills can't render names. Seekers also can't join client-side: unpublished jobs 404 for them.
- **Security holes:** the generic `POST /jobs/job-applications/` bypasses every apply validation (any authenticated user can create an application under any `user_account` with any status); **no status-transition rules** (seeker could self-accept); `user_account`/`job_post`/`cover_letter` writable on update.
- Duplicate seeker-skill attach → **500** (missing validator; DB unique constraint fires).
- Skill master list is admin-create-only — conflicts with the free-text skill UI (decision #1).
- Password can be set via `PATCH /users/{id}` **without current-password verification**.

## 3. Decisions (approved 2026-08-06)

1. **Skills stay free-text**: seeker-skill create accepts a skill *name*; backend get-or-creates the master `SkillSet` row case-insensitively.
2. **Backend changes are done by us** in a worktree off `staging`, landed via PR — the handoff-doc pattern is retired.
3. **Password change goes real** via a dedicated verified endpoint; the unverified PATCH path closes.
4. **Email is read-only** in settings this slice.
5. **`hasApplied` is derived** from the seeker's cached applications query — no dedicated endpoint, no extra fetch.
6. Slice-2 deferred minors + the anonymous-401 session-hint polish are **in scope** (§7–§8).

## 4. Backend changes (`feat/seeker-applications`)

### 4.1 Nested read serializers (write contracts unchanged)

**`JobPostActivityReadSerializer`** — used for viewset list/retrieve (and `/applications/user/{id}/`); `job_post` becomes a lean nested summary:

```json
{
  "id": "…", "user_account": "…",
  "job_post": {
    "id": "…", "job_title": "…",
    "company": {"id": "…", "company_name": "…"},
    "job_type": {"id": "…", "job_type_name": "…"},
    "job_location": {"city": "…", "country": "…"},
    "salary_min": "90000.00", "salary_max": "120000.00", "salary_type": "yearly",
    "deadline_date": "2026-09-30", "is_published": true, "is_active": true
  },
  "application_date": "2026-08-06T…Z", "application_status": "pending",
  "cover_letter": "…", "updated_at": "…"
}
```

Queryset already `select_related`s the chain (`with_related()`); extend it to cover `job_post__job_type`/`job_post__job_location` so the nested read adds no queries. The apply endpoint's `201 {message, data}` keeps the bare write shape (frontend only needs success).

**`SeekerSkillSetReadSerializer`** — `skill_set` becomes `{"id": "…", "skill_name": "Python"}` for list/retrieve **and** inside the dashboard payload's `skills` array.

### 4.2 Applications viewset lockdown

- **Remove `create`** from `JobPostActivityViewSet` (apply only via the validated `/jobs/apply/`). POST → 405.
- **Update immutability:** `user_account`, `job_post`, `cover_letter` read-only on update — the only writable field is `application_status`.
- **Status transitions** (serializer/service-level validation; violations → 400 `{application_status: [...]}`; non-owner writes remain 403/404 as today):

| Actor | Allowed transitions |
|---|---|
| Seeker (applicant) | `pending → withdrawn`, `reviewed → withdrawn` — nothing else |
| Company (job owner) | `pending → reviewed/accepted/rejected`, `reviewed → accepted/rejected` |
| Admin | unrestricted |

- DELETE stays as-is (applicant own + admin). Existing tests asserting the old permissive PATCH behavior are updated to the matrix.

### 4.3 Seeker skills

- `POST /seekers/seeker-skills/` accepts **either** `skill_set` (UUID) **or** `skill_name` (string, non-empty) — `skill_name` resolves via case-insensitive get-or-create on `SkillSet` (stored with the submitted casing when new).
- Duplicate attach (same seeker + skill) → **400** `{"skill_set": ["You already added this skill."]}` (restore the unique validation the read-only `user_account` field silently disabled).
- `PATCH` allows `skill_level` only.

### 4.4 Change password

`POST /api/v1/accounts/change-password/` (authenticated, throttle scope `login` 10/min):
- Body `{current_password, new_password}`; wrong current → 400 `{"current_password": ["Incorrect password."]}`; new password runs Django's validators → 400 field errors; success → 204. Refresh cookie/session untouched.
- `UserAccountSerializer.password` becomes **create-only** (rejected on update) — closing the unverified path. `perform_update`'s hashing branch goes away with it.

## 5. Frontend services

### 5.1 Module layout

```
src/lib/services/
  types.ts        ← +SeekerProfile, Education, Experience, SeekerSkill, Application,
                    ApplicationJob, ApplicationWithJob, AppStatus, DegreeType, Sex (moved
                    from mock/types.ts; mock re-imports — same pattern as Slice 2)
  seeker.ts       ← getSeekerProfile, updateSeekerProfile, add/deleteEducation,
                    add/deleteExperience, add/deleteSkill + adapters
  applications.ts ← listApplications, getApplication, applyToJob, withdrawApplication + adapter
  index.ts        ← barrel additions
src/lib/api/
  types.ts        ← DTOs: ApplicationRead, SeekerSkillRead, dashboard payload, etc.
  seekers.ts      ← NEW: typed calls to /seekers/* endpoints
  applications.ts ← NEW: typed calls to /jobs/job-applications/, /jobs/apply/
  auth.ts         ← +changePassword(current, next)
```

### 5.2 View-model deltas

- `ApplicationWithJob.job` narrows from `JobWithCompany | null` to **`ApplicationJob | null`**: `{id, title, type, city, country, salaryMin, salaryMax, salaryType, companyId, company: {id, name}, published}` — exactly what the two application screens render; the mock's full object still satisfies it structurally.
- `SeekerProfile` keeps its composite shape (screens untouched); `id` = the user-account UUID.

### 5.3 Function contracts & adapters

- `getSeekerProfile()` — parallel `GET /seekers/dashboard/{me.id}/` + `GET /accounts/me/`, composed: profile→`firstName/lastName/goals/contact(=contact_details)/resumeUrl`; account→`email/dob(=date_of_birth ?? '')/sex/photo(=user_image_url)`; education/experience/skills arrays adapted per the tables below. Requires an authenticated seeker session (`me.id` from `/me/`).
- `updateSeekerProfile(patch)` — fans out by key: `{firstName→first_name, lastName→last_name, goals, contact→contact_details, resumeUrl→resume_url}` → `PATCH /seekers/profiles/{id}/`; `{dob→date_of_birth (null when ''), sex, photo→user_image_url}` → `PATCH /accounts/users/{id}/`; both PATCHes run in parallel when the patch spans both; returns the merged view model (pages re-fetch via invalidation regardless). A name change additionally calls `refreshUser()` (§5.5).
- **Education adapter:** `school↔institute_university_name`, `degree↔degree_type`, `field↔field_of_study`, `start 'YYYY-MM' ↔ start_date 'YYYY-MM-01'`, `end '' ↔ end_date null`, `percentage number|null ↔ decimal string|null`.
- **Experience adapter:** `company↔company_name`, `position`, `city↔job_location_city`, `country↔job_location_country`, `description`, dates as above.
- **Skills:** `addSkill({name, level})` → `POST /seeker-skills/ {skill_name, skill_level}`; read maps `skill_set.skill_name→name`; duplicate → the 400 message surfaces as a toast.
- `listApplications()` — `GET /jobs/job-applications/?page_size=100` → `ApplicationWithJob[]` (`applied` = date part of `application_date`, `cover` = `cover_letter`, `job` from the nested summary; decimals→numbers, `''`→null as in Slice 2).
- `getApplication(id)` — retrieve; 404 → `null`.
- `applyToJob(jobId, cover)` — `POST /jobs/apply/ {user_account: me, job_post: jobId, cover_letter}`; the `{error}` body surfaces in the modal (currently silent).
- `withdrawApplication(id)` — `PATCH {application_status: 'withdrawn'}`.
- `hasApplied` service function is **deleted**; job-detail uses `useQuery(['applications'], listApplications, {enabled: isSeeker, select: apps => apps.some(a => a.jobId === id)})` — shares the cache with dashboard/applications. Withdrawn applications still count as "applied": the backend's `(user, job)` uniqueness blocks re-applying, so offering the Apply button after a withdrawal would invite a guaranteed 400 (matches mock behavior too).

### 5.4 Auth context: `refreshUser()`

New context method: re-runs `getMe()` + `buildSessionUser()` and updates `user` in place (no token work, no generation bump beyond guarding stale responses). Called after profile name saves.

### 5.5 Session-hint polish (the parked anonymous-401)

`localStorage` flag `wf-session` = `'1'` set on successful login/register/refresh; removed on logout and session-expiry. Bootstrap skips the refresh probe when the flag is absent (guest loads make zero auth calls and log no 401). Trade-off accepted: a user who clears localStorage but keeps the cookie logs in again. Flag is a hint only — the httpOnly cookie remains the source of truth.

## 6. Page changes

1. **dashboard / applications / application-detail** — import re-points only; stats stay client-computed; withdraw gains an error toast.
2. **profile.tsx** — import re-points; mutations gain error toasts (duplicate-skill 400 surfaces its message); name save triggers `refreshUser()` via the service.
3. **settings.tsx** — profile fields via `updateSeekerProfile`; **email rendered read-only** (input → static display); password form calls `changePassword` with field-level 400 mapping and success/error toasts.
4. **apply-modal.tsx** — real `applyToJob`; API `{error}` shown inline in the modal (e.g. already-applied after a stale cache).
5. **job-detail.tsx** — `hasApplied` import replaced by the shared applications query (§5.3).
6. **jobs.tsx** — `Number.isFinite` guards on URL-derived `minSalary`/`page` (cleanup item).

## 7. Held-over cleanup (one hygiene task)

`Object.freeze` the shared `EMPTY` result (or fresh object per call) in `jobs.ts`; `Promise.all` the type/stream resolutions in `listJobs`; exact-UUID assertions in `jobs.test.ts` + an unknown-stream short-circuit test; remove the three unused test imports; name `getPublicCompanies`'s params type (`PublicCompanyQuery`); shared salary-normalize helper used by `adaptJob` and `featured-jobs.tsx`; a `// TODO(slice-4)` marker on post-job.tsx's `?? 'yearly'` fallbacks. (The stub-sorting/pagination note stays a Slice-4 backlog item — no code now.)

## 8. Error handling

All new mutations get `onError` toasts (`ApiError.message`, field errors where the form has the field). Query errors on seeker screens fall back to existing empty states. 401s continue through the Slice-1 silent-refresh path; session expiry redirects via the existing guard.

## 9. Testing

- **Backend (worktree, TDD):** transition matrix (every allowed/forbidden cell), viewset POST → 405, update-immutability, nested read shapes (whole-object equality + query-count guard), skill `skill_name` get-or-create (new/existing/case-insensitive/duplicate 400), change-password (wrong current, weak new, success 204, PATCH password rejected), full suite + `ci` green.
- **Frontend:** MSW handlers/fixtures for dashboard, profiles, education, experience, seeker-skills, job-applications, apply, change-password (staging-shaped, auth-gated via the existing `denyUnlessAuthed`); adapter unit tests (date/decimal/enum mapping both directions); page integration tests per screen (RTL + MSW, mocked auth like Slice 2); session-hint tests (guest bootstrap makes no refresh call; flag lifecycle); existing 97 tests stay green; typecheck clean.
- **Live e2e** against the backend branch (worktree server): full seeker journey — register → profile build-out (education/experience/skill incl. duplicate) → browse → apply → applied-state → withdraw → password change → settings edits → session-hint behavior for a fresh anonymous visitor.

## 10. Definition of done

- [ ] Backend PR (`feat/seeker-applications` → staging) open with `ci` green: nested reads, lockdown + transitions, skills get-or-create, change-password, all tests.
- [ ] Frontend PR (`feat/slice3-seeker` → staging) open with `ci` green: all seeker screens + apply flow on real data, settings incl. real password change and read-only email, `hasApplied` derived, session-hint polish, cleanup items done.
- [ ] Live e2e journey passes against the backend branch; company-console screens (still mock) unaffected.
- [ ] Conventional commits; no attribution trailers; frontend PR merges only after the backend PR.
