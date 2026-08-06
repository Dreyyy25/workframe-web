# Backend Handoff — Public Browse Read APIs (Frontend Integration, Slice 2)

- **Date:** 2026-08-04
- **Target repo:** `Job-Board-API-only` (this document is written for a Claude session working in that repo)
- **Requested by:** the frontend repo `workframe-web` — roadmap in approved spec `docs/superpowers/specs/2026-07-01-backend-integration-design.md` §5 ("Slice 2 — Public browse")
- **Base branch:** `staging` (this doc was verified against `617f465`, 2026-08-04)
- **Scope:** read paths in `apps/jobs` + `apps/companies`, one throttle rate. **No models, no migrations, no auth changes, no changes to any write contract, no URL renames.** One new URL (public companies read).

## 1. Why

Frontend Slice 2 rewires the public browse pages — jobs list, job detail, companies list, company profile — from mock data to the real API. These pages must work for **anonymous** visitors. Today:

- Job posts list/retrieve already work anonymously, but return **bare UUIDs** for `company`, `job_type`, `job_location` and omit skills — a job card cannot show the employer's name without N+1 follow-up requests.
- The filter set cannot express the UI's filters (category = business stream, minimum salary with "max-or-min" semantics, highest-salary sort).
- Companies are **not publicly readable at all** (`/companies/profile/` requires authentication even for GET).
- Two read endpoints break for anonymous users (job-locations 401s; company-images 500s).

## 2. Current state (verify before starting; may have drifted)

- `apps/jobs/views.py` — `JobPostViewSet`: anon `get_queryset()` → `published()` (is_published + is_active), `filterset_class = JobPostFilter`, `search_fields = ['job_title', 'job_description', 'company__company_name']`, `ordering_fields = ['created_at', 'salary_max', 'salary_min', 'deadline_date']`. `JobLocationViewSet`: `permission_classes = [IsAuthenticated]` (the bug documented in the Slice-1 handoff §7).
- `apps/jobs/serializers.py` — `JobPostSerializer` lists FK fields plainly (UUID output); `to_representation` already strips `job_description_hidden` for non-owners. `JobPostSkillSetSerializer` exists.
- `apps/jobs/models.py` — `JobPost.required_skills` → `JobPostSkillSet` (`skill_set` FK → `seekers.SkillSet.skill_name`; `skill_level` choices Beginner/Intermediate/Advanced/Expert; `is_required`). `salary_min`/`salary_max` nullable decimals; `salary_type` choices hourly/monthly/yearly. `JobPostQuerySet.with_related()` already select-relates company/business_stream/job_type/job_location and prefetches `required_skills__skill_set`.
- `apps/companies/views.py` — `CompanyViewSet` (`/companies/profile/`): `IsCompanyOwnerOrAdmin.has_permission` requires authentication for SAFE_METHODS → anon GET = 401. Its `get_queryset` reads `user.user_type` unguarded (would 500 for anon if permission ever allowed it). `CompanyImagesViewSet`: permission **does** allow anon reads, but `get_queryset` hits the same unguarded `user.user_type` → anonymous GET `/companies/company-images/` is a live **500**.
- `apps/companies/models.py` — `Company.status` choices active/inactive/suspended, **default `'active'`**; `CompanyQuerySet.active()` filters `status='active'`; `with_related()` select-relates `user_account`, `business_stream` and prefetches `images`.
- `jobApp/settings/base.py` — `DEFAULT_THROTTLE_RATES['anon'] = '100/day'`. Pagination: `StandardResultsSetPagination` (default 20, `page_size` query param, max 100) — fine as is.

## 3. Required changes

### 3.1 Job locations — anonymous reads (carried over from Slice-1 handoff §7)

`JobLocationViewSet` → `permission_classes = [IsAuthenticatedOrReadOnly]` (matches its own docstring and every sibling reference endpoint). Test: anonymous GET list → 200.

### 3.2 Job posts — nested read representation

Keep the **write** contract exactly as is (`job_type`/`job_location` accept UUIDs on create/update; `company` stays read-only/auto-assigned). On **read** (list + retrieve), replace the bare UUIDs with nested objects and add skills:

```json
{
  "id": "…",
  "company": {
    "id": "…",
    "company_name": "Halcyon Systems",
    "business_stream": {"id": "…", "business_stream_name": "Data & AI"}
  },
  "job_type": {"id": "…", "job_type_name": "Full-time"},
  "job_location": {"id": "…", "street_address": "…", "city": "Berlin", "country": "Germany", "zip": "…", "country_code": "…"},
  "required_skills": [
    {"id": "…", "skill_set": {"id": "…", "skill_name": "Python"}, "skill_level": "Advanced", "is_required": true}
  ],
  "job_title": "…", "job_description": "…",
  "salary_min": "90000.00", "salary_max": "120000.00", "salary_type": "yearly",
  "deadline_date": "…", "is_published": true, "is_active": true,
  "created_at": "…", "updated_at": "…"
}
```

- `company.id` must be the **Company** id (the frontend links job → `/companies/{id}`), not the user-account id.
- Read/write asymmetry (nested out, UUID in) is intended — standard DRF pattern; implement however fits the codebase style (nested read-only serializers + `to_representation`, or separate read serializer).
- `with_related()` already fetches everything needed — no extra queries per row (worth a query-count assertion if that pattern exists in the test suite).
- The existing `job_description_hidden` owner-stripping behavior must be preserved.
- Update the drf-spectacular schema if it now misrepresents the read shape.

### 3.3 Job posts — filters, ordering, search

In `apps/jobs/filters.py` / `views.py`:

1. **`business_stream`** — UUID filter on `company__business_stream` (the UI's "Category" filter).
2. **`salary_floor`** — number filter with coalesce semantics: match jobs where `COALESCE(salary_max, salary_min) >= X`; jobs with **both** null never match. (The UI's "Min. salary" means "could I earn at least X here" — a 90k–120k role must match X=100000, so plain `salary_min__gte` is wrong.) Keep the existing `salary_min_gte`/`salary_max_lte` untouched.
3. **Highest-salary ordering** — annotate the queryset with `salary_rank = Coalesce(salary_max, salary_min, Value(0))` and add `'salary_rank'` to `ordering_fields`, so `ordering=-salary_rank` returns highest-paying first with salary-less jobs **last**. (Plain `-salary_max` puts NULLs first on Postgres.) Note the decimal `Value(0)` may need an `output_field`.
4. **Search over skills** — add `'required_skills__skill_set__skill_name'` to `search_fields`, so "Python" finds jobs requiring Python. M2M-style joins can duplicate rows; DRF's `SearchFilter` applies `distinct()` when required, but add a test proving a job with two matching skills appears **once**.

### 3.4 Public companies read — new read-only endpoint

Add a **read-only** viewset at **`/api/v1/companies/public/`** (list + retrieve), `AllowAny`:

- Queryset: `Company.objects.active().with_related()` + annotation `open_roles_count` = count of that company's job posts with `is_published=True, is_active=True`.
- **List** item shape:

```json
{
  "id": "…",
  "company_name": "Halcyon Systems",
  "business_stream": {"id": "…", "business_stream_name": "Data & AI"},
  "profile_description": "…",
  "company_website_url": "…",
  "status": "active",
  "open_roles_count": 3
}
```

- **Retrieve** adds `"images": [{"id": "…", "image_url": "…", "created_at": "…"}]`.
- **Exclude `contact_email` and `user_account`** from the public shape — neither belongs in an anonymous payload.
- Filters: `search` over `company_name` + `profile_description`; `business_stream` UUID filter. Standard pagination.
- **Why a new route instead of loosening `/companies/profile/`:** `profile/`'s `get_queryset` conflates management with browsing — a logged-in company user only ever sees their *own* row, which would break the public companies page for them, and the register flow's step-2 PATCH depends on the current semantics. A separate read-only route has zero regression risk on the just-shipped auth flows. **Do not change `/companies/profile/`.**

### 3.5 Company images — fix anonymous 500

`CompanyImagesViewSet.get_queryset` guard: `if user.is_authenticated and user.user_type == 'company'`. Anonymous GET currently raises `AttributeError` (AnonymousUser has no `user_type`) → 500, even though the permission class allows the read. Apply the same one-line defensive guard in `CompanyViewSet.get_queryset` while there (latent today, but the same bug). With §3.4 nesting images, the frontend won't call this endpoint for browse — this is a correctness fix regardless.

### 3.6 Anonymous throttle rate

`'anon': '100/day'` is too low once anonymous browse is real — the jobs page fires up to 3 requests per filter interaction. Raise it (suggestion: `'300/hour'`, or `'2000/day'` if per-day is preferred); the existing burst throttle (60/min) remains the abuse backstop. Your call on the exact number.

### 3.7 Unchanged

All auth endpoints and cookie behavior, all write paths and their contracts, `/companies/profile/` and `/companies/dashboard/`, pagination class and rates other than `anon`, all existing URL names.

## 4. Tests (TDD — write these first)

1. Job-locations: anonymous GET list → 200.
2. Job posts (anonymous list + retrieve): `company`/`job_type`/`job_location`/`required_skills` are nested per §3.2; `job_description_hidden` absent for anon (regression guard); owner still sees it.
3. Filters: `business_stream` narrows correctly; `salary_floor` — matches when `salary_max ≥ X`, matches when `salary_max` null but `salary_min ≥ X`, excludes when both null or both below; `ordering=-salary_rank` puts salary-less jobs last; search by skill name finds the job and a job with two matching skills appears exactly once.
4. Companies public: anonymous list → 200 with only `status='active'` companies; `open_roles_count` counts only published+active posts; retrieve includes `images`; payload never contains `contact_email` or `user_account`; POST/PATCH/DELETE → 401/405.
5. Company images: anonymous GET list → 200 (was 500).
6. Full suite green: `uv run python manage.py test`.

## 5. Manual verification (curl, anonymous — no auth headers)

```bash
curl -s http://localhost:8000/api/v1/jobs/job-locations/ | head -c 200          # 200, not 401
curl -s "http://localhost:8000/api/v1/jobs/job-posts/?page_size=2" \
  | python -m json.tool                                                          # nested company/type/location/skills
curl -s "http://localhost:8000/api/v1/jobs/job-posts/?business_stream=<uuid>&salary_floor=100000&ordering=-salary_rank"
curl -s "http://localhost:8000/api/v1/companies/public/" | python -m json.tool   # active companies + open_roles_count
curl -s "http://localhost:8000/api/v1/companies/public/<company-id>/"            # includes images
curl -s http://localhost:8000/api/v1/companies/company-images/ | head -c 200     # 200, not 500
```

## 6. Acceptance criteria

- [ ] All four browse surfaces readable anonymously: job-posts (nested shape), job-locations, companies/public, company-images.
- [ ] `business_stream`, `salary_floor`, `ordering=-salary_rank`, and skill-name search behave per §3.3.
- [ ] `/companies/public/` exposes only active companies, with `open_roles_count`, images on retrieve, and no `contact_email`/`user_account`.
- [ ] No write contract changed; `/companies/profile/`, `/companies/dashboard/`, and all auth endpoints untouched.
- [ ] Anon throttle raised per §3.6.
- [ ] `uv run python manage.py test` fully green; OpenAPI schema (`/api/schema/`) reflects the new read shapes and route.

## 7. Frontend consumption reference (context only — no action)

| Page | Calls |
|---|---|
| Jobs browse | `GET /jobs/job-posts/?search=&job_type=&business_stream=&salary_floor=&ordering=&page=&page_size=9` |
| Job detail | `GET /jobs/job-posts/{id}/` (skills + company come nested) |
| Companies browse | `GET /companies/public/?search=&business_stream=&page_size=100` |
| Company profile | `GET /companies/public/{id}/` + `GET /jobs/job-posts/?company={id}` |
| Filter dropdowns | `GET /jobs/job-types/`, `GET /companies/business-streams/` |

## 8. Conventions

- Branch off `staging` (e.g. `feat/public-browse-reads`), conventional commits (`feat(jobs): …`, `feat(companies): …`, `fix(companies): …`), merge back to `staging` when green.
- Do **not** add a `Co-Authored-By: Claude` trailer to commits.
- `API_DOCUMENTATION.md` / Postman drift is accepted for now.
