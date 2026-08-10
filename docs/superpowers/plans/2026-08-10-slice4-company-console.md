# Slice 4 — Company Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the six company-console pages onto the real Django API, close the backend contract gaps and permission bugs they build on, then delete the frontend mock layer entirely.

**Architecture:** Backend first (worktree off `staging`, TDD, one PR), then frontend bottom-up (API/DTO layer → MSW surface → services with adapter tests → pages → cleanup/deletion), mirroring the Slice 2/3 layering: `src/lib/api/*` typed transport, `src/lib/services/*` view-model adapters, TanStack Query in pages. A tiny Modal-autofocus PR lands before any console page work.

**Tech Stack:** Django 5 + DRF + django-filter + drf-spectacular (backend); React 18 + Vite + TS + TanStack Query v5 + MSW 2 + Vitest (frontend).

**Spec (governing document):** `docs/superpowers/specs/2026-08-10-slice4-company-console-design.md`. Where plan and spec disagree, the spec wins — flag the conflict in your report.

## Global Constraints

- **Repos:** frontend `C:\Users\almos\projects\workframe-web` (branch `feat/slice4-company`); backend `C:\Users\almos\Projects\Job-Board-API-only` — work ONLY in the worktree `C:/Users/almos/Projects/job-board-api-slice4` (Task 2 creates it). Never commit directly in the backend main checkout; never merge anything — PRs only.
- **Commits:** conventional (`feat(jobs): …`, `test(companies): …`). **NO `Co-Authored-By: Claude` trailer — repo rule in both repos.**
- **Push (both repos):** `git -c credential.helper= -c credential.helper='!gh auth git-credential' push -u origin <branch>` (plain push hangs on GCM).
- **Backend tests:** run from the worktree: `uv run python manage.py test apps.<app> --noinput` (scoped) and `uv run python manage.py test --noinput` (full). Teardown "DROP DATABASE" noise from concurrent sessions is known-benign; the `Ran N tests ... OK` line is the verdict. If the test DB is stuck ("being accessed by other users"), drop it via psycopg autocommit `DROP DATABASE IF EXISTS test_job_board` and rerun.
- **Backend gates before PR:** `uv run ruff format --check .` , `uv run ruff check .`, `uv run python manage.py makemigrations --check --dry-run` (this slice must create NO migrations), `uv run python manage.py spectacular --file schema.yml --validate` (no warnings), full suite green.
- **Frontend tests:** `npm run test` (Vitest single run), `npm run typecheck`. MSW: `onUnhandledRequest: 'error'` — every new endpoint a test touches needs a handler; write handlers behind `denyUnlessAuthed` for authed endpoints. tsconfig lib is ES2020 — **no `Array.prototype.at()`**.
- **TanStack Query v5:** `queryFn` must never resolve `undefined` (services return `null`); default `staleTime` is 60s with `refetchOnWindowFocus: false`, so missing invalidations = user-visible staleness.
- **Backend salary values** serialize as decimal strings (`"90000.00"`); frontend `num()` (`src/lib/services/adapter-utils.ts`) converts.
- **Wire asymmetry (memorize):** `salary_type` unset = `''` on the wire (CharField blank, NOT nullable — `null` → 400); `deadline_date` unset = real `null`. View models use `null` for both.
- The backend test-user helper pattern (used everywhere in this plan's backend tests): `UserAccount.objects.create_user(email=..., password="Str0ng-Password!", user_type="company"|"job_seeker")`; signals auto-create the role profile (`user.company_profile` / `user.seeker_profile`); auth via the module-level `_auth(self.client, user)` helper already defined at the top of each app's `tests.py`.

---

### Task 1: PR 0 — Modal autofocus fix (frontend, own branch)

**Files:**
- Modify: `src/components/ui/modal.tsx:34-39` (autofocus target), `src/components/ui/modal.tsx:93` (content wrapper)
- Modify: `src/components/jobs/__tests__/apply-modal.test.tsx` (delete `settleAutofocus` at lines 33-41; fix call sites at lines 69 and 101)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Modal` now focuses the first focusable element **inside `{children}`** (fallback: first focusable in the panel). No API change.

- [ ] **Step 1: Create the branch off up-to-date staging**

```powershell
git -C C:\Users\almos\projects\workframe-web checkout staging
git -C C:\Users\almos\projects\workframe-web pull
git -C C:\Users\almos\projects\workframe-web checkout -b fix/modal-autofocus
```

- [ ] **Step 2: Make the existing tests express the REAL expectation (failing first)**

In `src/components/jobs/__tests__/apply-modal.test.tsx`: delete the `settleAutofocus` helper (lines 33-41) and replace both call sites (lines 69, 101) with an assertion that the modal's first form field receives focus:

```tsx
// where the test previously did: await settleAutofocus()
await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus())
```

(The apply modal's only textbox is the cover-letter textarea. If the file queries by a more specific accessible name elsewhere, match that convention.)

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test -- apply-modal`
Expected: FAIL — focus is on the header Close button, not the textarea.

- [ ] **Step 4: Fix the modal**

In `src/components/ui/modal.tsx`, wrap children (line 93) and scope the autofocus query:

```tsx
// line 93:  {children}  becomes:
<div data-modal-content>{children}</div>
```

```tsx
// lines 34-39, the setTimeout body becomes:
const t = window.setTimeout(() => {
  const panel = panelRef.current
  if (!panel) return
  const content = panel.querySelector<HTMLElement>('[data-modal-content]')
  const focusable =
    content?.querySelector<HTMLElement>('input, textarea, select, button') ??
    panel.querySelector<HTMLElement>('input, textarea, select, button')
  focusable?.focus()
}, 30)
```

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm run test` then `npm run typecheck`
Expected: all pass (140 baseline), no type errors.

- [ ] **Step 6: Commit, push, open PR**

```powershell
git add src/components/ui/modal.tsx src/components/jobs/__tests__/apply-modal.test.tsx
git commit -m "fix(ui): modal autofocus targets the first field in content, not the header close button"
git -c credential.helper= -c credential.helper='!gh auth git-credential' push -u origin fix/modal-autofocus
gh pr create --repo Dreyyy25/workframe-web --base staging --head fix/modal-autofocus --title "fix(ui): modal autofocus targets content, not the close button" --body "Scopes the 30ms autofocus query to the children wrapper; deletes the settleAutofocus test workarounds. Pre-existing bug from d1307e5."
```

Then return to the slice branch: `git checkout feat/slice4-company`. **After the user merges PR 0**, run `git fetch origin; git merge origin/staging` on `feat/slice4-company` (required before Task 16/18, which test modal-bearing pages).

---

### Task 2: Backend worktree + B6 draft-retrieve permission fix

**Files:**
- Create: worktree `C:/Users/almos/Projects/job-board-api-slice4` on branch `feat/slice4-company-console`
- Modify: `apps/jobs/permissions.py:28-44` (`IsJobPosterOrAdmin.has_object_permission`), `apps/jobs/permissions.py:177-193` (`CanManageJobSkills.has_object_permission`)
- Test: `apps/jobs/tests.py` (new class `DraftRetrievePermissionTests`)

**Interfaces:**
- Produces: owner/admin can GET their own unpublished job post (and its skill rows). Everyone else keeps current behavior.

- [ ] **Step 1: Create the worktree**

```powershell
git -C C:\Users\almos\Projects\Job-Board-API-only fetch origin
git -C C:\Users\almos\Projects\Job-Board-API-only worktree add C:/Users/almos/Projects/job-board-api-slice4 -b feat/slice4-company-console origin/staging
```

All backend work happens in `C:/Users/almos/Projects/job-board-api-slice4` from here on.

- [ ] **Step 2: Write the failing tests** (append to `apps/jobs/tests.py`)

```python
class DraftRetrievePermissionTests(APITestCase):
    """B6: safe-method object permission must pass for the owner/admin of an
    unpublished post, not just for published ones."""

    def setUp(self):
        self.owner = UserAccount.objects.create_user(
            email="draft-owner@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.rival = UserAccount.objects.create_user(
            email="draft-rival@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.admin = UserAccount.objects.create_user(
            email="draft-admin@example.com", password="Str0ng-Password!", user_type="job_seeker"
        )
        self.admin.is_staff = True
        self.admin.save()
        stream = BusinessStream.objects.create(business_stream_name="Tech")
        company = self.owner.company_profile
        company.company_name = "DraftCo"
        company.business_stream = stream
        company.save()
        job_type = JobType.objects.create(job_type_name="Full-time")
        location = JobLocation.objects.create(city="Oslo", country="Norway")
        self.draft = JobPost.objects.create(
            company=company, job_type=job_type, job_location=location,
            job_title="Draft role", job_description="wip", is_published=False,
        )
        skill = SkillSet.objects.create(skill_name="Rust")
        self.draft_skill = JobPostSkillSet.objects.create(
            job_post=self.draft, skill_set=skill, skill_level="Advanced", is_required=True
        )

    def test_owner_retrieves_own_draft(self):
        _auth(self.client, self.owner)
        r = self.client.get(f"/api/v1/jobs/job-posts/{self.draft.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(r.data["is_published"])

    def test_admin_retrieves_draft(self):
        _auth(self.client, self.admin)
        r = self.client.get(f"/api/v1/jobs/job-posts/{self.draft.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_anonymous_gets_404_for_draft(self):
        r = self.client.get(f"/api/v1/jobs/job-posts/{self.draft.id}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_rival_company_gets_404_for_draft(self):
        _auth(self.client, self.rival)
        r = self.client.get(f"/api/v1/jobs/job-posts/{self.draft.id}/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_retrieves_draft_skill_row(self):
        _auth(self.client, self.owner)
        r = self.client.get(f"/api/v1/jobs/job-skills/{self.draft_skill.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
```

- [ ] **Step 3: Run to verify failure**

Run: `uv run python manage.py test apps.jobs.tests.DraftRetrievePermissionTests --noinput`
Expected: `test_owner_retrieves_own_draft`, `test_admin_retrieves_draft`, `test_owner_retrieves_draft_skill_row` FAIL with 403; the two 404 tests already pass (queryset narrowing).

- [ ] **Step 4: Implement**

`IsJobPosterOrAdmin.has_object_permission` (replace the SAFE_METHODS branch at `apps/jobs/permissions.py:35-37`):

```python
        # Read permissions: published jobs for everyone; drafts only for
        # the owning company or admins (B6 — owner must be able to load a
        # draft into the edit form).
        if request.method in SAFE_METHODS:
            if obj.is_published:
                return True
            user = request.user
            return bool(
                user
                and user.is_authenticated
                and (
                    user.is_staff
                    or user.is_superuser
                    or obj.company.user_account_id == user.id
                )
            )
```

`CanManageJobSkills.has_object_permission` (replace lines 185-186) — same shape against `obj.job_post`:

```python
        if request.method in SAFE_METHODS:
            if obj.job_post.is_published:
                return True
            user = request.user
            return bool(
                user
                and user.is_authenticated
                and (
                    user.is_staff
                    or user.is_superuser
                    or obj.job_post.company.user_account_id == user.id
                )
            )
```

- [ ] **Step 5: Run the class, then the whole jobs app**

Run: `uv run python manage.py test apps.jobs --noinput`
Expected: all pass.

- [ ] **Step 6: Commit**

```powershell
git add apps/jobs/permissions.py apps/jobs/tests.py
git commit -m "fix(jobs): owners and admins can retrieve their own unpublished drafts"
```

---

### Task 3: B8 — company queryset union + `is_active` filter

**Files:**
- Modify: `apps/jobs/managers.py:5-49` (`JobPostQuerySet` — new method), `apps/jobs/views.py:128-136` (`get_queryset`), `apps/jobs/filters.py:20-22` (Meta fields)
- Test: `apps/jobs/tests.py` (new class `CompanyPublicBoardTests`)

**Interfaces:**
- Produces: authenticated company list = published ∪ own (drafts included); `?company=<uuid>` narrows to one company; `?is_published=true&is_active=true` restores the pure public view; new query param `is_active`.
- Frontend contract (Task 19 consumes): public browse passes `is_published=true&is_active=true`; console passes `company=<companyId>` with no publish filters.

- [ ] **Step 1: Write the failing tests**

```python
class CompanyPublicBoardTests(APITestCase):
    """B8: a logged-in company browsing the list sees the whole public board
    plus its own drafts — not only its own posts."""

    def setUp(self):
        self.owner = UserAccount.objects.create_user(
            email="board-owner@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.rival = UserAccount.objects.create_user(
            email="board-rival@example.com", password="Str0ng-Password!", user_type="company"
        )
        stream = BusinessStream.objects.create(business_stream_name="Tech")
        for user, name in ((self.owner, "OwnerCo"), (self.rival, "RivalCo")):
            c = user.company_profile
            c.company_name = name
            c.business_stream = stream
            c.save()
        job_type = JobType.objects.create(job_type_name="Full-time")
        location = JobLocation.objects.create(city="Lisbon", country="Portugal")

        def mk(user, title, **kw):
            return JobPost.objects.create(
                company=user.company_profile, job_type=job_type, job_location=location,
                job_title=title, job_description="d", **kw,
            )

        self.own_published = mk(self.owner, "Own live")
        self.own_draft = mk(self.owner, "Own draft", is_published=False)
        self.own_inactive = mk(self.owner, "Own inactive", is_active=False)
        self.rival_published = mk(self.rival, "Rival live")
        self.rival_draft = mk(self.rival, "Rival draft", is_published=False)

    def _titles(self, response):
        return {j["job_title"] for j in response.data["results"]}

    def test_company_list_is_published_union_own(self):
        _auth(self.client, self.owner)
        r = self.client.get("/api/v1/jobs/job-posts/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(
            self._titles(r),
            {"Own live", "Own draft", "Own inactive", "Rival live"},
        )

    def test_company_filter_narrows_to_own_console_view(self):
        _auth(self.client, self.owner)
        r = self.client.get(
            f"/api/v1/jobs/job-posts/?company={self.owner.company_profile.id}"
        )
        self.assertEqual(self._titles(r), {"Own live", "Own draft", "Own inactive"})

    def test_publish_filters_restore_public_view(self):
        _auth(self.client, self.owner)
        r = self.client.get("/api/v1/jobs/job-posts/?is_published=true&is_active=true")
        self.assertEqual(self._titles(r), {"Own live", "Rival live"})

    def test_anonymous_unchanged(self):
        r = self.client.get("/api/v1/jobs/job-posts/")
        self.assertEqual(self._titles(r), {"Own live", "Rival live"})
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run python manage.py test apps.jobs.tests.CompanyPublicBoardTests --noinput`
Expected: `test_company_list_is_published_union_own` and `test_publish_filters_restore_public_view` FAIL (company currently sees only its own posts; `is_active` filter doesn't exist). Others pass.

- [ ] **Step 3: Implement**

`apps/jobs/managers.py` — add to `JobPostQuerySet` (after `for_company`):

```python
    def visible_to_company(self, user):
        """Public board ∪ the company's own posts (drafts included).

        The own-arm deliberately carries unpublished/inactive rows — the
        console's ?company= view depends on them; the public pages opt back
        into the pure public view via ?is_published=true&is_active=true.
        """
        return self.filter(
            models.Q(is_published=True, is_active=True)
            | models.Q(company__user_account=user)
        )
```

`apps/jobs/views.py:134-135` — the company branch of `JobPostViewSet.get_queryset` becomes:

```python
        if user.is_authenticated and user.user_type == 'company':
            return qs.visible_to_company(user)
```

`apps/jobs/filters.py:22` — Meta fields gains `is_active`:

```python
        fields = ["job_type", "company", "salary_type", "is_published", "is_active"]
```

- [ ] **Step 4: Run the jobs app suite**

Run: `uv run python manage.py test apps.jobs --noinput`
Expected: all pass. If any existing test pinned the old company-only list, update it to the union semantics **and say so in your report** (the spec explicitly changes this behavior).

- [ ] **Step 5: Commit**

```powershell
git add apps/jobs/managers.py apps/jobs/views.py apps/jobs/filters.py apps/jobs/tests.py
git commit -m "feat(jobs): company users see the public board plus their own drafts; add is_active filter"
```

---

### Task 4: B1 — applicant name nested in application reads

**Files:**
- Modify: `apps/jobs/serializers.py:116-130` (`JobPostActivityReadSerializer`), `apps/jobs/managers.py:59-66` (`JobPostActivityQuerySet.with_related`)
- Test: `apps/jobs/tests.py` (extend `ApplicationNestedReadTests` whole-shape test at ~lines 929-942; new tests)

**Interfaces:**
- Produces (frontend Task 11 consumes): every application read gains `"applicant": {"id": "<user uuid>", "first_name": str, "last_name": str} | null`. `user_account` (bare UUID) unchanged.

- [ ] **Step 1: Write the failing tests**

Extend the existing whole-shape assertion in `ApplicationNestedReadTests` (find the pinned dict around `apps/jobs/tests.py:929-942`) — add the `applicant` key to the expected payload:

```python
        # inside the existing whole-shape expected dict:
        "applicant": {
            "id": str(self.seeker.id),
            "first_name": self.seeker.seeker_profile.first_name,
            "last_name": self.seeker.seeker_profile.last_name,
        },
```

(Set real names in that test's setUp first: `p = self.seeker.seeker_profile; p.first_name = "Ada"; p.last_name = "Lovelace"; p.save()` — adjust to the fixture names already used there if any.)

Add new tests to the same class:

```python
    def test_applicant_null_when_profile_missing(self):
        from apps.seekers.models import SeekerProfile
        SeekerProfile.objects.filter(user_account=self.seeker).delete()
        _auth(self.client, self.seeker)
        r = self.client.get(f"/api/v1/jobs/job-applications/{self.application.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIsNone(r.data["applicant"])

    def test_company_list_carries_applicant_names(self):
        _auth(self.client, self.owner)
        r = self.client.get("/api/v1/jobs/job-applications/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        row = r.data["results"][0]
        self.assertEqual(row["applicant"]["first_name"], self.seeker.seeker_profile.first_name)
```

(Reuse the class's existing `self.application`, `self.owner`, `self.seeker` fixtures — read its `setUp` first and match names.)

- [ ] **Step 2: Run to verify failure**

Run: `uv run python manage.py test apps.jobs.tests.ApplicationNestedReadTests --noinput`
Expected: FAIL — `applicant` key absent.

- [ ] **Step 3: Implement**

`apps/jobs/serializers.py` — add above `JobPostActivityReadSerializer`:

```python
class ApplicationApplicantSerializer(serializers.Serializer):
    """Inline applicant identity for company screens. Email is deliberately
    absent — companies never see seeker emails."""

    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
```

In `JobPostActivityReadSerializer`: add `'applicant'` to `fields`, and:

```python
    applicant = serializers.SerializerMethodField()

    @extend_schema_field(ApplicationApplicantSerializer(allow_null=True))
    def get_applicant(self, obj):
        profile = getattr(obj.user_account, 'seeker_profile', None)
        if profile is None:
            return None
        return {
            'id': str(obj.user_account_id),
            'first_name': profile.first_name,
            'last_name': profile.last_name,
        }
```

(`getattr` is safe here: Django's reverse one-to-one raises a `DoesNotExist` that subclasses `AttributeError`, so a missing profile yields the default `None`. Import `extend_schema_field` from `drf_spectacular.utils` — check the file head; add the import if absent.)

`apps/jobs/managers.py:59-66` — `JobPostActivityQuerySet.with_related` adds the profile hop:

```python
    def with_related(self):
        return self.select_related(
            'user_account',
            'user_account__seeker_profile',
            'job_post',
            'job_post__company',
            'job_post__job_type',
            'job_post__job_location',
        )
```

- [ ] **Step 4: Run the app suite (query-count tests included)**

Run: `uv run python manage.py test apps.jobs --noinput`
Expected: all pass. `select_related` on a one-to-one adds a JOIN, not a query — the pinned query counts must NOT change; if one does, find out why before touching the pin.

- [ ] **Step 5: Commit**

```powershell
git add apps/jobs/serializers.py apps/jobs/managers.py apps/jobs/tests.py
git commit -m "feat(jobs): nest applicant identity (name, no email) in application reads"
```

---

### Task 5: B2 — dashboard stats

**Files:**
- Modify: `apps/companies/services.py:14-38` (`build_company_dashboard`), `apps/companies/views.py:28-34` (inline dashboard schema serializer — search for `_CompanyDashboardSerializer`)
- Test: `apps/companies/tests.py` (new class `CompanyDashboardStatsTests`)

**Interfaces:**
- Produces (frontend Task 11 consumes): dashboard payload gains `"stats": {"active_posts": int, "total_applications": int, "new_this_week": int}` — `new_this_week` = applications with `application_date >= now - 7 days` (rolling, UTC).

- [ ] **Step 1: Write the failing tests**

```python
class CompanyDashboardStatsTests(APITestCase):
    def setUp(self):
        from datetime import timedelta
        from django.utils import timezone
        from apps.jobs.models import JobType, JobLocation, JobPost, JobPostActivity

        self.owner = UserAccount.objects.create_user(
            email="stats-owner@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.other = UserAccount.objects.create_user(
            email="stats-other@example.com", password="Str0ng-Password!", user_type="company"
        )
        seeker = UserAccount.objects.create_user(
            email="stats-seeker@example.com", password="Str0ng-Password!", user_type="job_seeker"
        )
        stream = BusinessStream.objects.create(business_stream_name="Tech")
        for user, name in ((self.owner, "StatsCo"), (self.other, "OtherCo")):
            c = user.company_profile
            c.company_name = name
            c.business_stream = stream
            c.save()
        jt = JobType.objects.create(job_type_name="Full-time")
        loc = JobLocation.objects.create(city="Kyoto", country="Japan")

        def mk(user, title, **kw):
            return JobPost.objects.create(
                company=user.company_profile, job_type=jt, job_location=loc,
                job_title=title, job_description="d", **kw,
            )

        live = mk(self.owner, "Live")
        mk(self.owner, "Draft", is_published=False)
        mk(self.owner, "Inactive", is_active=False)
        rival_job = mk(self.other, "Rival live")

        now = timezone.now()
        recent = JobPostActivity.objects.create(user_account=seeker, job_post=live)
        recent.application_date = now - timedelta(days=6)
        recent.save()
        seeker2 = UserAccount.objects.create_user(
            email="stats-seeker2@example.com", password="Str0ng-Password!", user_type="job_seeker"
        )
        old = JobPostActivity.objects.create(user_account=seeker2, job_post=live)
        old.application_date = now - timedelta(days=8)
        old.save()
        # rival application must not count for owner
        JobPostActivity.objects.create(user_account=seeker, job_post=rival_job)

    def test_stats_shape_and_math(self):
        _auth(self.client, self.owner)
        r = self.client.get(f"/api/v1/companies/dashboard/{self.owner.id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(
            r.data["stats"],
            {"active_posts": 1, "total_applications": 2, "new_this_week": 1},
        )
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run python manage.py test apps.companies.tests.CompanyDashboardStatsTests --noinput`
Expected: FAIL — `stats` key absent.

- [ ] **Step 3: Implement**

`apps/companies/services.py` — extend `build_company_dashboard`'s return:

```python
from datetime import timedelta

from django.utils import timezone

# ... inside build_company_dashboard, before the return:
    from apps.jobs.models import JobPostActivity

    applications = JobPostActivity.objects.filter(job_post__company=company)
    stats = {
        'active_posts': company.job_posts.filter(is_published=True, is_active=True).count(),
        'total_applications': applications.count(),
        'new_this_week': applications.filter(
            application_date__gte=timezone.now() - timedelta(days=7)
        ).count(),
    }

    return {
        'company': CompanySerializer(company).data,
        'images': CompanyImagesSerializer(images, many=True).data,
        'stats': stats,
    }
```

`apps/companies/views.py` — the inline `_CompanyDashboardSerializer` gains a matching `stats` inline serializer (mirror how `company`/`images` are declared there):

```python
class _CompanyDashboardStatsSerializer(serializers.Serializer):
    active_posts = serializers.IntegerField()
    total_applications = serializers.IntegerField()
    new_this_week = serializers.IntegerField()
```

and add `stats = _CompanyDashboardStatsSerializer()` to `_CompanyDashboardSerializer`.

- [ ] **Step 4: Run the companies app suite**

Run: `uv run python manage.py test apps.companies --noinput`
Expected: all pass (an existing dashboard whole-shape test may need the `stats` key added — that's the correct fix).

- [ ] **Step 5: Commit**

```powershell
git add apps/companies/services.py apps/companies/views.py apps/companies/tests.py
git commit -m "feat(companies): dashboard returns active_posts/total_applications/new_this_week stats"
```

---

### Task 6: B3 — company status rules

**Files:**
- Modify: `apps/companies/serializers.py:12-27` (`CompanySerializer`)
- Test: `apps/companies/tests.py` (new class `CompanyStatusRuleTests`)

**Interfaces:**
- Produces: owner may PATCH `status` only to `active`/`inactive`; while `suspended`, any owner status *change* → 400 (same-value passes; other fields stay editable); admins unrestricted.

- [ ] **Step 1: Write the failing tests**

```python
class CompanyStatusRuleTests(APITestCase):
    def setUp(self):
        self.owner = UserAccount.objects.create_user(
            email="status-owner@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.admin = UserAccount.objects.create_user(
            email="status-admin@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.admin.is_staff = True
        self.admin.save()
        stream = BusinessStream.objects.create(business_stream_name="Tech")
        self.company = self.owner.company_profile
        self.company.company_name = "StatusCo"
        self.company.business_stream = stream
        self.company.save()
        self.url = f"/api/v1/companies/profile/{self.company.id}/"

    def test_owner_can_pause_and_resume(self):
        _auth(self.client, self.owner)
        r = self.client.patch(self.url, {"status": "inactive"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        r = self.client.patch(self.url, {"status": "active"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_owner_cannot_set_suspended(self):
        _auth(self.client, self.owner)
        r = self.client.patch(self.url, {"status": "suspended"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_suspended_owner_cannot_escape(self):
        self.company.status = "suspended"
        self.company.save()
        _auth(self.client, self.owner)
        r = self.client.patch(self.url, {"status": "active"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_suspended_same_value_and_other_fields_ok(self):
        self.company.status = "suspended"
        self.company.save()
        _auth(self.client, self.owner)
        r = self.client.patch(
            self.url, {"status": "suspended", "profile_description": "still here"}, format="json"
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.company.refresh_from_db()
        self.assertEqual(self.company.profile_description, "still here")

    def test_admin_unrestricted(self):
        self.company.status = "suspended"
        self.company.save()
        _auth(self.client, self.admin)
        r = self.client.patch(self.url, {"status": "active"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
```

Note: the admin here is staff, so `CompanyViewSet.get_queryset` (admin → all) and `IsCompanyOwnerOrAdmin` both let the PATCH through — no ownership conflict.

- [ ] **Step 2: Run to verify failure**

Run: `uv run python manage.py test apps.companies.tests.CompanyStatusRuleTests --noinput`
Expected: `test_owner_cannot_set_suspended` and `test_suspended_owner_cannot_escape` FAIL (currently 200).

- [ ] **Step 3: Implement** — add to `CompanySerializer`:

```python
    def validate_status(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is None or user.is_staff or user.is_superuser:
            return value
        current = self.instance.status if self.instance else None
        if value == current:
            return value  # no-op writes always pass (mirrors the application-status rule)
        if current == 'suspended':
            raise serializers.ValidationError(
                'Your account is suspended. Contact support to restore it.'
            )
        if value not in ('active', 'inactive'):
            raise serializers.ValidationError('Status may only be set to active or inactive.')
        return value
```

(`user is None` covers serializer use without a request context — e.g. the dashboard's read-only `CompanySerializer(company)`, which never calls validate anyway; belt and braces.)

- [ ] **Step 4: Run the companies suite**

Run: `uv run python manage.py test apps.companies --noinput`
Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/companies/serializers.py apps/companies/tests.py
git commit -m "feat(companies): owners self-serve active/inactive only; suspended is admin-only both directions"
```

---

### Task 7: B4 — job-skills get-or-create + ownership

**Files:**
- Modify: `apps/jobs/serializers.py:296-301` (`JobPostSkillSetSerializer`)
- Test: `apps/jobs/tests.py` (new class `JobSkillWriteTests`)

**Interfaces:**
- Produces (frontend Task 13 consumes): `POST /jobs/job-skills/` accepts `{job_post, skill_name | skill_set, skill_level, is_required}`; `skill_name` is case-insensitive get-or-create; duplicate → 400 `"This skill is already on the job post."`; non-owner create → 403; PATCH may change only `skill_level`/`is_required`.

- [ ] **Step 1: Write the failing tests**

```python
class JobSkillWriteTests(APITestCase):
    def setUp(self):
        self.owner = UserAccount.objects.create_user(
            email="skill-owner@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.rival = UserAccount.objects.create_user(
            email="skill-rival@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.seeker = UserAccount.objects.create_user(
            email="skill-seeker@example.com", password="Str0ng-Password!", user_type="job_seeker"
        )
        stream = BusinessStream.objects.create(business_stream_name="Tech")
        for user, name in ((self.owner, "SkillCo"), (self.rival, "RivalCo")):
            c = user.company_profile
            c.company_name = name
            c.business_stream = stream
            c.save()
        jt = JobType.objects.create(job_type_name="Full-time")
        loc = JobLocation.objects.create(city="Turin", country="Italy")
        self.job = JobPost.objects.create(
            company=self.owner.company_profile, job_type=jt, job_location=loc,
            job_title="Role", job_description="d",
        )
        self.url = "/api/v1/jobs/job-skills/"

    def _post(self, body):
        return self.client.post(self.url, body, format="json")

    def test_create_by_new_skill_name(self):
        _auth(self.client, self.owner)
        r = self._post({"job_post": str(self.job.id), "skill_name": "Terraform",
                        "skill_level": "Advanced", "is_required": True})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SkillSet.objects.filter(skill_name="Terraform").exists())

    def test_create_by_name_reuses_case_insensitively(self):
        existing = SkillSet.objects.create(skill_name="Python")
        _auth(self.client, self.owner)
        r = self._post({"job_post": str(self.job.id), "skill_name": "  pYtHon ",
                        "skill_level": "Beginner", "is_required": False})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SkillSet.objects.filter(skill_name__iexact="python").count(), 1)
        self.assertEqual(JobPostSkillSet.objects.get(job_post=self.job).skill_set_id, existing.id)

    def test_create_by_skill_set_uuid(self):
        s = SkillSet.objects.create(skill_name="Go")
        _auth(self.client, self.owner)
        r = self._post({"job_post": str(self.job.id), "skill_set": str(s.id),
                        "skill_level": "Expert", "is_required": True})
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

    def test_neither_name_nor_uuid_400(self):
        _auth(self.client, self.owner)
        r = self._post({"job_post": str(self.job.id), "skill_level": "Expert", "is_required": True})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_400_with_friendly_message(self):
        s = SkillSet.objects.create(skill_name="SQL")
        JobPostSkillSet.objects.create(job_post=self.job, skill_set=s, skill_level="Advanced")
        _auth(self.client, self.owner)
        r = self._post({"job_post": str(self.job.id), "skill_name": "sql",
                        "skill_level": "Beginner", "is_required": True})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already on the job post", str(r.data))

    def test_rival_company_create_403(self):
        _auth(self.client, self.rival)
        r = self._post({"job_post": str(self.job.id), "skill_name": "Ruby",
                        "skill_level": "Advanced", "is_required": True})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_seeker_create_403(self):
        _auth(self.client, self.seeker)
        r = self._post({"job_post": str(self.job.id), "skill_name": "Ruby",
                        "skill_level": "Advanced", "is_required": True})
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_level_only(self):
        s = SkillSet.objects.create(skill_name="C++")
        row = JobPostSkillSet.objects.create(job_post=self.job, skill_set=s, skill_level="Beginner")
        _auth(self.client, self.owner)
        r = self.client.patch(f"{self.url}{row.id}/", {"skill_level": "Expert"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        r = self.client.patch(f"{self.url}{row.id}/", {"skill_name": "Rust"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        other = SkillSet.objects.create(skill_name="Zig")
        r = self.client.patch(f"{self.url}{row.id}/", {"skill_set": str(other.id)}, format="json")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run python manage.py test apps.jobs.tests.JobSkillWriteTests --noinput`
Expected: name-path tests FAIL (`skill_name` unknown / `skill_set` required); rival/seeker tests FAIL (currently 201 — the ownership hole).

- [ ] **Step 3: Implement** — replace `JobPostSkillSetSerializer` (`apps/jobs/serializers.py:296-301`):

```python
class JobPostSkillSetSerializer(serializers.ModelSerializer):
    """Write serializer. Create accepts either an existing skill_set UUID or a
    free-text skill_name (case-insensitive get-or-create — mirrors the seeker
    pattern). Create is owner-scoped; updates may change level/required only.

    Meta.validators is emptied on purpose: with both unique_together fields
    writable, DRF auto-attaches UniqueTogetherValidator, whose
    enforce_required_fields would 400 every skill_name-only create once
    skill_set is optional. Uniqueness is enforced manually in validate()."""

    skill_name = serializers.CharField(
        write_only=True, required=False, max_length=100, allow_blank=False
    )

    class Meta:
        model = JobPostSkillSet
        fields = ['id', 'job_post', 'skill_set', 'skill_level', 'is_required', 'skill_name']
        read_only_fields = ['id']
        extra_kwargs = {'skill_set': {'required': False}}
        validators = []

    def validate(self, attrs):
        if self.instance is not None:  # update: level/required only
            if 'job_post' in attrs or 'skill_set' in attrs or 'skill_name' in attrs:
                raise serializers.ValidationError(
                    {'skill_set': ['Cannot change the job or skill; delete and re-add instead.']}
                )
            return attrs

        name = (attrs.pop('skill_name', '') or '').strip()
        if not attrs.get('skill_set') and not name:
            raise serializers.ValidationError({'skill_set': ['Provide skill_set or skill_name.']})
        if name and not attrs.get('skill_set'):
            existing = SkillSet.objects.filter(skill_name__iexact=name).first()
            attrs['skill_set'] = existing or SkillSet.objects.create(skill_name=name)

        job_post = attrs['job_post']
        user = self.context['request'].user
        if not (user.is_staff or user.is_superuser) and job_post.company.user_account_id != user.id:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied('You can only manage skills on your own job posts.')

        if JobPostSkillSet.objects.filter(job_post=job_post, skill_set=attrs['skill_set']).exists():
            raise serializers.ValidationError(
                {'skill_set': ['This skill is already on the job post.']}
            )
        return attrs
```

(`SkillSet` is already imported at the top of the file for the read serializers — verify, add `from apps.seekers.models import SkillSet` if not.)

- [ ] **Step 4: Run the jobs suite**

Run: `uv run python manage.py test apps.jobs --noinput`
Expected: all pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/jobs/serializers.py apps/jobs/tests.py
git commit -m "feat(jobs): job-skill create accepts skill_name get-or-create and is owner-scoped"
```

---

### Task 8: B5 — applications inbox filters

**Files:**
- Modify: `apps/jobs/views.py:160-190` (`JobPostActivityViewSet`)
- Test: `apps/jobs/tests.py` (new class `ApplicationFilterTests`)

**Interfaces:**
- Produces (frontend Task 11 consumes): `GET /jobs/job-applications/?job_post=<uuid>&application_status=<status>&ordering=application_date|-application_date|updated_at|-updated_at`. Default order stays newest-first (model `Meta.ordering` — already there, do NOT re-add).

- [ ] **Step 1: Write the failing tests**

```python
class ApplicationFilterTests(APITestCase):
    def setUp(self):
        self.owner = UserAccount.objects.create_user(
            email="filter-owner@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.seeker = UserAccount.objects.create_user(
            email="filter-seeker@example.com", password="Str0ng-Password!", user_type="job_seeker"
        )
        seeker2 = UserAccount.objects.create_user(
            email="filter-seeker2@example.com", password="Str0ng-Password!", user_type="job_seeker"
        )
        stream = BusinessStream.objects.create(business_stream_name="Tech")
        c = self.owner.company_profile
        c.company_name = "FilterCo"
        c.business_stream = stream
        c.save()
        jt = JobType.objects.create(job_type_name="Full-time")
        loc = JobLocation.objects.create(city="Quito", country="Ecuador")
        self.job_a = JobPost.objects.create(
            company=c, job_type=jt, job_location=loc, job_title="A", job_description="d"
        )
        self.job_b = JobPost.objects.create(
            company=c, job_type=jt, job_location=loc, job_title="B", job_description="d"
        )
        JobPostActivity.objects.create(user_account=self.seeker, job_post=self.job_a)
        JobPostActivity.objects.create(
            user_account=seeker2, job_post=self.job_b, application_status="reviewed"
        )

    def test_company_filters_by_job_post(self):
        _auth(self.client, self.owner)
        r = self.client.get(f"/api/v1/jobs/job-applications/?job_post={self.job_a.id}")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data["results"]), 1)
        self.assertEqual(r.data["results"][0]["job_post"]["id"], str(self.job_a.id))

    def test_company_filters_by_status(self):
        _auth(self.client, self.owner)
        r = self.client.get("/api/v1/jobs/job-applications/?application_status=reviewed")
        self.assertEqual(len(r.data["results"]), 1)

    def test_filters_do_not_widen_seeker_scope(self):
        _auth(self.client, self.seeker)
        r = self.client.get(f"/api/v1/jobs/job-applications/?job_post={self.job_b.id}")
        self.assertEqual(len(r.data["results"]), 0)

    def test_ordering_param(self):
        _auth(self.client, self.owner)
        r = self.client.get("/api/v1/jobs/job-applications/?ordering=application_date")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run python manage.py test apps.jobs.tests.ApplicationFilterTests --noinput`
Expected: filter tests FAIL (params silently ignored → both rows returned).

- [ ] **Step 3: Implement** — add two attributes to `JobPostActivityViewSet` (after `permission_classes`):

```python
    filterset_fields = ['job_post', 'application_status']
    ordering_fields = ['application_date', 'updated_at']
```

(The global `DEFAULT_FILTER_BACKENDS` already attach `DjangoFilterBackend` + `OrderingFilter`; do not add `filter_backends` or a default `ordering` — the model's `Meta.ordering = ['-application_date']` already sorts newest-first.)

- [ ] **Step 4: Run the jobs suite** — `uv run python manage.py test apps.jobs --noinput` — all pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/jobs/views.py apps/jobs/tests.py
git commit -m "feat(jobs): applications inbox filterable by job_post/application_status with ordering"
```

---

### Task 9: B7 — company-images ownership

**Files:**
- Modify: `apps/companies/serializers.py:30-34` (`CompanyImagesSerializer`), `apps/companies/views.py:95-116` (`CompanyImagesViewSet`)
- Test: `apps/companies/tests.py` (new class `CompanyImageOwnershipTests`)

**Interfaces:**
- Produces (frontend Task 11 consumes): `POST /companies/company-images/` body is just `{image_url}` — `company` is read-only, derived from the caller; non-company create → 403. Delete: owner 204; others 403/404.

- [ ] **Step 1: Write the failing tests**

```python
class CompanyImageOwnershipTests(APITestCase):
    def setUp(self):
        self.owner = UserAccount.objects.create_user(
            email="img-owner@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.rival = UserAccount.objects.create_user(
            email="img-rival@example.com", password="Str0ng-Password!", user_type="company"
        )
        self.seeker = UserAccount.objects.create_user(
            email="img-seeker@example.com", password="Str0ng-Password!", user_type="job_seeker"
        )
        stream = BusinessStream.objects.create(business_stream_name="Tech")
        for user, name in ((self.owner, "ImgCo"), (self.rival, "RivalCo")):
            c = user.company_profile
            c.company_name = name
            c.business_stream = stream
            c.save()
        self.url = "/api/v1/companies/company-images/"

    def test_company_creates_for_itself(self):
        _auth(self.client, self.owner)
        r = self.client.post(self.url, {"image_url": "https://cdn.example.com/a.jpg"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        img = CompanyImages.objects.get()
        self.assertEqual(img.company, self.owner.company_profile)

    def test_supplied_company_id_is_ignored(self):
        _auth(self.client, self.rival)
        r = self.client.post(
            self.url,
            {"image_url": "https://cdn.example.com/b.jpg",
             "company": str(self.owner.company_profile.id)},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CompanyImages.objects.get().company, self.rival.company_profile)

    def test_seeker_create_403(self):
        _auth(self.client, self.seeker)
        r = self.client.post(self.url, {"image_url": "https://cdn.example.com/c.jpg"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_deletes_own_image(self):
        img = CompanyImages.objects.create(
            company=self.owner.company_profile, image_url="https://cdn.example.com/d.jpg"
        )
        _auth(self.client, self.owner)
        r = self.client.delete(f"{self.url}{img.id}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_seeker_cannot_delete(self):
        img = CompanyImages.objects.create(
            company=self.owner.company_profile, image_url="https://cdn.example.com/e.jpg"
        )
        _auth(self.client, self.seeker)
        r = self.client.delete(f"{self.url}{img.id}/")
        self.assertIn(r.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))
        self.assertTrue(CompanyImages.objects.filter(id=img.id).exists())
```

- [ ] **Step 2: Run to verify failure**

Run: `uv run python manage.py test apps.companies.tests.CompanyImageOwnershipTests --noinput`
Expected: `test_supplied_company_id_is_ignored` FAILS (image lands on the rival's target today), `test_seeker_create_403` FAILS (currently 400/201, not 403), `test_company_creates_for_itself` FAILS (400: company required).

- [ ] **Step 3: Implement**

`CompanyImagesSerializer` — make `company` read-only:

```python
class CompanyImagesSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyImages
        fields = ['id', 'company', 'image_url', 'created_at']
        read_only_fields = ['id', 'company', 'created_at']
```

`CompanyImagesViewSet` — add:

```python
    def perform_create(self, serializer):
        """Images always attach to the caller's own company (B7)."""
        from rest_framework.exceptions import PermissionDenied

        user = self.request.user
        if user.user_type != 'company':
            raise PermissionDenied('Only company users can add images.')
        serializer.save(company=user.company_profile)
```

(Admins create images via Django admin — accepted in the spec.)

- [ ] **Step 4: Run the companies suite** — `uv run python manage.py test apps.companies --noinput` — all pass.

- [ ] **Step 5: Commit**

```powershell
git add apps/companies/serializers.py apps/companies/views.py apps/companies/tests.py
git commit -m "fix(companies): image create is owner-scoped; company field read-only"
```

---

### Task 10: Backend gates + PR

**Files:** none new — verification + PR.

- [ ] **Step 1: Full gates** (in the worktree)

```powershell
uv run ruff format --check .
uv run ruff check .
uv run python manage.py makemigrations --check --dry-run
uv run python manage.py spectacular --file schema.yml --validate
uv run python manage.py test --noinput
```

Expected: format/lint clean, **no migrations**, schema validates without warnings, full suite green (474 baseline + ~25 new). If `ruff format` wants changes, apply (`uv run ruff format .`) and amend into a `chore(format)` commit.

- [ ] **Step 2: Push + PR**

```powershell
git -c credential.helper= -c credential.helper='!gh auth git-credential' push -u origin feat/slice4-company-console
gh pr create --repo Dreyyy25/Job-Board-API-only --base staging --head feat/slice4-company-console --title "feat: slice-4 company console backend — applicant nesting, dashboard stats, ownership + draft fixes" --body "Implements spec B1-B8 (workframe-web docs/superpowers/specs/2026-08-10-slice4-company-console-design.md): nested applicant identity on application reads (no email), dashboard stats, status self-serve rules (suspended admin-only), job-skill skill_name get-or-create + owner-scoped create, inbox filters, draft-retrieve permission fix, image-create ownership, company list = published union own."
```

Do NOT merge. Report the PR URL. Frontend Tasks 11+ may proceed against MSW immediately; the live e2e (Task 20) needs this PR merged into backend `staging` first.

---

### Task 11: Frontend API layer — DTOs, api modules, MSW surface, session reuse

**Files:**
- Modify: `src/lib/api/types.ts` (extend `CompanyDashboard`, `ApplicationReadDto`; new write DTOs)
- Create: `src/lib/api/companies.ts`, `src/lib/api/jobs.ts`
- Modify: `src/lib/api/applications.ts` (filter params), `src/lib/api/public.ts` (`JobPostQuery` gains `is_published`/`is_active`), `src/lib/auth/session.ts` (reuse `getCompanyDashboard`), `src/lib/auth/auth-context.tsx` (export `AuthValue`)
- Modify: `src/test/msw/fixtures.ts`, `src/test/msw/handlers.ts`
- Test: existing suite must stay green; typecheck is the main gate here (thin transport layer — behavior is tested via services in Tasks 12-14).

**Interfaces (produced — later tasks consume exactly these):**

```ts
// api/types.ts additions
export interface CompanyDashboardStats { active_posts: number; total_applications: number; new_this_week: number }
// CompanyDashboard gains: stats: CompanyDashboardStats
export interface ApplicationApplicantDto { id: string; first_name: string; last_name: string }
// ApplicationReadDto gains: applicant: ApplicationApplicantDto | null
export interface JobPostWriteBody {
  job_title: string; job_description: string; job_type: string; job_location: string
  salary_min: number | null; salary_max: number | null; salary_type: SalaryType | ''
  deadline_date: string | null; is_published: boolean
}
export interface JobLocationDto { id: string; street_address: string; city: string; country: string; zip: string; country_code: string }
export interface JobSkillDto { id: string; job_post: string; skill_set: string; skill_level: string; is_required: boolean }

// api/companies.ts
export function getCompanyDashboard(userId: string): Promise<CompanyDashboard>
export function patchCompanyProfile(companyId: string, body: Record<string, unknown>): Promise<CompanyProfile>
export function postCompanyImage(body: { image_url: string }): Promise<CompanyImage>
export function deleteCompanyImage(imageId: string): Promise<void>

// api/jobs.ts
export function postJobPost(body: JobPostWriteBody): Promise<JobPost>
export function patchJobPost(id: string, body: Partial<JobPostWriteBody>): Promise<JobPost>
export function deleteJobPost(id: string): Promise<void>
export function postJobLocation(body: { city: string; country: string }): Promise<JobLocationDto>
export function postJobSkill(body: { job_post: string; skill_name?: string; skill_set?: string; skill_level: string; is_required: boolean }): Promise<JobSkillDto>
export function patchJobSkill(id: string, body: { skill_level?: string; is_required?: boolean }): Promise<JobSkillDto>
export function deleteJobSkill(id: string): Promise<void>

// api/applications.ts — signature change (backwards-compatible)
export function getApplications(params?: { job_post?: string; application_status?: ApplicationStatus }): Promise<Paginated<ApplicationReadDto>>

// api/public.ts — JobPostQuery gains
is_published?: boolean; is_active?: boolean
```

- [ ] **Step 1: Extend `src/lib/api/types.ts`** with the DTOs above. Check `SalaryType` is exported there (it is — reuse); use the existing naming/comment style. Add to `ApplicationReadDto`: `applicant: ApplicationApplicantDto | null`. Add to `CompanyDashboard`: `stats: CompanyDashboardStats`.

- [ ] **Step 2: Create `src/lib/api/companies.ts`**

```ts
/** Company console transport: dashboard, profile writes, images. */
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { CompanyDashboard, CompanyImage, CompanyProfile } from './types'

export function getCompanyDashboard(userId: string) {
  return apiGet<CompanyDashboard>(`/companies/dashboard/${userId}/`)
}

export function patchCompanyProfile(companyId: string, body: Record<string, unknown>) {
  return apiPatch<CompanyProfile>(`/companies/profile/${companyId}/`, { body })
}

export function postCompanyImage(body: { image_url: string }) {
  return apiPost<CompanyImage>('/companies/company-images/', { body })
}

export function deleteCompanyImage(imageId: string) {
  return apiDelete<void>(`/companies/company-images/${imageId}/`)
}
```

(Match the verb-helper call signatures used in `src/lib/api/seekers.ts` — same option shape.)

- [ ] **Step 3: Create `src/lib/api/jobs.ts`** with the seven functions from the Interfaces block, endpoints `/jobs/job-posts/`, `/jobs/job-locations/`, `/jobs/job-skills/`, same style.

- [ ] **Step 4: `src/lib/api/applications.ts`** — `getApplications` accepts optional params and spreads them after `page_size`:

```ts
export function getApplications(params?: { job_post?: string; application_status?: ApplicationStatus }) {
  return apiGet<Paginated<ApplicationReadDto>>('/jobs/job-applications/', {
    page_size: 100,
    ...params,
  })
}
```

- [ ] **Step 5: `src/lib/api/public.ts`** — add `is_published?: boolean; is_active?: boolean` to `JobPostQuery` (Task 19 wires the callers).

- [ ] **Step 6: `src/lib/auth/session.ts`** — replace the inline dashboard fetch (line 24) with the module function:

```ts
import { getCompanyDashboard } from '@/lib/api/companies'
// in fetchDisplayName:
const dashboard = await getCompanyDashboard(user.id)
```

Drop the now-unused `CompanyDashboard` import/`apiGet` usage if nothing else needs them. **Behavior unchanged.**

- [ ] **Step 7: `src/lib/auth/auth-context.tsx`** — change `interface AuthValue` to `export interface AuthValue` (Slice 3 backlog item; no other change).

- [ ] **Step 8: MSW fixtures + handlers**

`src/test/msw/fixtures.ts`: add/extend (follow the existing factory style — functions returning fresh objects, exported ID constants):
- `companyDashboard()` gains `stats: { active_posts: 3, total_applications: 12, new_this_week: 4 }` (and export `COMPANY_ID` if not already — `companyDashboard().company.id`).
- `applicationDto()` gains `applicant: { id: <the seeker account id constant>, first_name: 'Avery', last_name: 'Quinn' }`.
- New: `companyAccount()` — an `/accounts/me/` payload with `user_type: 'company'` (clone `seekerAccount()` shape); `companyImageDto()`, `jobLocationDto()`, `jobSkillDto()` matching the DTO shapes above; export `COMPANY_IMAGE_ID`, `JOB_SKILL_ID`.

`src/test/msw/handlers.ts`: add default happy-path handlers, all behind `denyUnlessAuthed`:

```ts
http.patch('*/api/v1/companies/profile/:id/', async ({ request }) =>
  denyUnlessAuthed(request) ??
  HttpResponse.json({ ...companyDashboard().company, ...(await request.json()) as object })),
http.post('*/api/v1/companies/company-images/', ({ request }) =>
  denyUnlessAuthed(request) ?? HttpResponse.json(companyImageDto(), { status: 201 })),
http.delete('*/api/v1/companies/company-images/:id/', ({ request }) =>
  denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 })),
http.post('*/api/v1/jobs/job-posts/', ({ request }) =>
  denyUnlessAuthed(request) ?? HttpResponse.json(jobPost(), { status: 201 })),
http.patch('*/api/v1/jobs/job-posts/:id/', async ({ request }) =>
  denyUnlessAuthed(request) ??
  HttpResponse.json({ ...jobPost(), ...(await request.json()) as object })),
http.delete('*/api/v1/jobs/job-posts/:id/', ({ request }) =>
  denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 })),
http.post('*/api/v1/jobs/job-locations/', ({ request }) =>
  denyUnlessAuthed(request) ?? HttpResponse.json(jobLocationDto(), { status: 201 })),
http.post('*/api/v1/jobs/job-skills/', ({ request }) =>
  denyUnlessAuthed(request) ?? HttpResponse.json(jobSkillDto(), { status: 201 })),
http.patch('*/api/v1/jobs/job-skills/:id/', async ({ request }) =>
  denyUnlessAuthed(request) ??
  HttpResponse.json({ ...jobSkillDto(), ...(await request.json()) as object })),
http.delete('*/api/v1/jobs/job-skills/:id/', ({ request }) =>
  denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 })),
```

(`jobPost()` already exists. The `is_published` semantics of the PATCH echo are enough for unit tests.)

- [ ] **Step 9: Verify**

Run: `npm run typecheck` then `npm run test`
Expected: clean types; full suite green — the `applicationDto` and `companyDashboard` additions are additive, but if any Slice 3 test pinned an exact object shape (e.g. `toEqual` on a whole DTO), update the pin to include the new keys and note it in your report.

- [ ] **Step 10: Commit**

```powershell
git add src/lib/api src/lib/auth/session.ts src/lib/auth/auth-context.tsx src/test/msw
git commit -m "feat(api): company console transport layer, applicant/stats DTOs, MSW company surface"
```

---

### Task 12: Services — enums, meta options, company console/profile/images

**Files:**
- Create: `src/lib/services/enums.ts`, `src/lib/services/company.ts` (part 1)
- Modify: `src/lib/services/meta.ts` (option-list exports), `src/lib/services/types.ts` (console view models), `src/lib/services/index.ts` (barrel)
- Test: `src/lib/services/__tests__/company.test.ts` (create; follow the existing services test conventions — MSW server from `src/test/msw/server`, `_resetMetaForTests()` in `beforeEach`)

**Interfaces (produced):**

```ts
// services/enums.ts — values copied VERBATIM from src/lib/mock/data.ts ENUMS (they match backend choices)
export const SALARY_TYPES: readonly SalaryType[]
export const SKILL_LEVELS: readonly SkillLevel[]
export const SEX_OPTIONS: readonly Sex[]
export const DEGREE_TYPES: readonly DegreeType[]

// services/meta.ts additions
export async function listStreamOptions(): Promise<{ id: string; name: string }[]>
export async function listJobTypeOptions(): Promise<{ id: string; name: string }[]>

// services/types.ts additions
export interface CompanyConsoleImage { id: string; url: string }
export interface CompanyConsoleStats { activePosts: number; totalApplicants: number; newThisWeek: number }
export interface CompanyConsole {
  companyId: string; name: string; streamId: string; streamName: string | null
  status: CompanyStatus; website: string; description: string
  images: CompanyConsoleImage[]; stats: CompanyConsoleStats
}
export interface CompanyProfilePatch { name?: string; streamId?: string; status?: CompanyStatus; website?: string; description?: string }

// services/company.ts (this task's half)
export async function getCompanyConsole(): Promise<CompanyConsole>
export async function updateCompanyProfile(companyId: string, patch: CompanyProfilePatch): Promise<void>
export async function addCompanyImage(url: string): Promise<void>
export async function removeCompanyImage(imageId: string): Promise<void>
```

- [ ] **Step 1: Write the failing tests** (`src/lib/services/__tests__/company.test.ts`)

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { companyDashboard, BUSINESS_STREAMS_LIST } from '@/test/msw/fixtures'
import { setAccessToken } from '@/lib/api/client'
import { _resetMetaForTests } from '@/lib/services/meta'
import { addCompanyImage, getCompanyConsole, removeCompanyImage, updateCompanyProfile } from '@/lib/services/company'

beforeEach(() => {
  setAccessToken('test-token')
  _resetMetaForTests()
})

describe('getCompanyConsole', () => {
  it('flattens dashboard + joins stream name from meta', async () => {
    const dash = companyDashboard()
    const console_ = await getCompanyConsole()
    expect(console_.companyId).toBe(dash.company.id)
    expect(console_.name).toBe(dash.company.company_name)
    expect(console_.streamId).toBe(dash.company.business_stream)
    // fixtures: BUSINESS_STREAMS_LIST contains the dashboard's stream id
    const expected = BUSINESS_STREAMS_LIST.find((s) => s.id === dash.company.business_stream)
    expect(console_.streamName).toBe(expected ? expected.business_stream_name : null)
    expect(console_.stats).toEqual({ activePosts: 3, totalApplicants: 12, newThisWeek: 4 })
    expect(console_.images[0]).toEqual({ id: dash.images[0].id, url: dash.images[0].image_url })
  })

  it('streamName null when the meta fetch fails', async () => {
    server.use(
      http.get('*/api/v1/companies/business-streams/', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 }),
      ),
    )
    const console_ = await getCompanyConsole()
    expect(console_.streamName).toBeNull()
  })
})

describe('updateCompanyProfile', () => {
  it('maps view-model keys to API field names and omits untouched keys', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.patch('*/api/v1/companies/profile/:id/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(companyDashboard().company)
      }),
    )
    await updateCompanyProfile('cid-1', { name: 'NewCo', streamId: 'st-1', status: 'inactive' })
    expect(body).toEqual({ company_name: 'NewCo', business_stream: 'st-1', status: 'inactive' })
  })
})

describe('images', () => {
  it('addCompanyImage posts image_url; removeCompanyImage deletes by id', async () => {
    let posted: Record<string, unknown> = {}
    let deletedId = ''
    server.use(
      http.post('*/api/v1/companies/company-images/', async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: 'img-9', company: 'cid-1', image_url: posted.image_url, created_at: '2026-08-10T00:00:00Z' }, { status: 201 })
      }),
      http.delete('*/api/v1/companies/company-images/:id/', ({ params }) => {
        deletedId = params.id as string
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await addCompanyImage('https://cdn.example.com/x.jpg')
    await removeCompanyImage('img-7')
    expect(posted).toEqual({ image_url: 'https://cdn.example.com/x.jpg' })
    expect(deletedId).toBe('img-7')
  })
})
```

(Check how existing services tests import/reset — `src/lib/services/__tests__/` has Slice 2/3 examples; match their setup, incl. any `clearAccessToken` afterEach. If `companyDashboard().company.business_stream` is not an id present in `BUSINESS_STREAMS_LIST`, fix the **fixture** so it is — the join must be exercisable.)

- [ ] **Step 2: Run to verify failure** — `npm run test -- company` → FAIL (module doesn't exist).

- [ ] **Step 3: Implement**

`src/lib/services/enums.ts` — copy the arrays **verbatim** from `src/lib/mock/data.ts` `ENUMS` (`salaryType`, `skillLevel`, `sex`, `degreeType`) as the four exported constants typed against the services types. (`appStatus`/`companyStatus` are NOT carried over — no surviving consumer.)

`src/lib/services/meta.ts` — add:

```ts
export async function listStreamOptions(): Promise<{ id: string; name: string }[]> {
  return fetchStreams()
}

export async function listJobTypeOptions(): Promise<{ id: string; name: string }[]> {
  return fetchJobTypes()
}
```

`src/lib/services/types.ts` — add the view models from the Interfaces block.

`src/lib/services/company.ts`:

```ts
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
```

`src/lib/services/index.ts` — export the new value functions + types (follow the barrel's grouping style).

- [ ] **Step 4: Run** — `npm run test -- company` PASS, then `npm run test` + `npm run typecheck` — all green.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/services src/test/msw
git commit -m "feat(services): company console composite with stream-name meta join; enums module"
```

---

### Task 13: Services — company jobs + saveJob composite

**Files:**
- Modify: `src/lib/services/company.ts` (part 2), `src/lib/services/types.ts`, `src/lib/services/index.ts`
- Test: `src/lib/services/__tests__/company-jobs.test.ts` (create)

**Interfaces (produced — Task 15/16 consume):**

```ts
// services/types.ts additions
export interface CompanyJobRow {
  id: string; title: string; type: string; typeId: string; city: string; country: string
  salaryMin: number | null; salaryMax: number | null; salaryType: SalaryType | null
  deadline: string | null; published: boolean; active: boolean; posted: string
}
export interface CompanyJobSkillRow { id: string | null; name: string; level: SkillLevel; required: boolean }
export interface CompanyJobDetail extends CompanyJobRow { description: string; skillRows: CompanyJobSkillRow[] }
export interface CompanyJobInput {
  title: string; description: string; typeId: string; city: string; country: string
  salaryMin: number | null; salaryMax: number | null; salaryType: SalaryType | null
  deadline: string | null; published: boolean; skills: CompanyJobSkillRow[]
}

// services/company.ts additions
export class JobSaveError extends Error { readonly jobId: string; readonly cause: unknown }
export async function listCompanyJobs(companyId: string): Promise<CompanyJobRow[]>
export async function getCompanyJob(id: string): Promise<CompanyJobDetail | null>   // 404 → null
export async function saveJob(input: CompanyJobInput, existing?: CompanyJobDetail): Promise<string>  // returns job id
export async function setJobPublished(id: string, published: boolean): Promise<void>
export async function deleteJob(id: string): Promise<void>
```

- [ ] **Step 1: Write the failing tests** — cover exactly these behaviors (MSW request-capture style from Task 12):

```ts
// src/lib/services/__tests__/company-jobs.test.ts — test list (write each as a real test):
// 1. listCompanyJobs passes company + page_size=100 params; adapts a JobPost dto:
//    title=job_title, type=job_type.job_type_name, typeId=job_type.id,
//    city/country from job_location, salaryMin/Max via num(), salaryType ''→null,
//    deadline=deadline_date, published=is_published, active=is_active,
//    posted=created_at.slice(0,10)
// 2. getCompanyJob maps required_skills → skillRows [{id, name: skill_set.skill_name, level: skill_level, required: is_required}]
//    and 404 → null
// 3. saveJob CREATE: posts location {city,country} first, then job post with
//    job_location=<returned id>, salary_type '' when input.salaryType is null (WIRE ASYMMETRY),
//    deadline_date null when input.deadline is null, then one job-skill POST per skill
//    with skill_name/skill_level/is_required — assert exact bodies and call order
// 4. saveJob CREATE partial failure: job-post 201, first skill POST 500 →
//    rejects with JobSaveError carrying the new job id
// 5. saveJob EDIT: diff by row id — existing rows [A(id sk-1), B(id sk-2)],
//    input keeps A with changed level, drops B, adds C(id null) →
//    exactly: PATCH sk-1 {skill_level}, DELETE sk-2, POST {skill_name:'C',...};
//    patches only changed job-post fields; no location POST when city/country unchanged
// 6. saveJob EDIT with changed city → posts a new location and includes
//    job_location in the PATCH body
// 7. location 400 (city:['This field is required.']) on CREATE propagates as
//    plain ApiError (NOT JobSaveError — no job exists yet)
```

Each numbered case is one `it(...)` with `server.use` capture handlers and exact `expect(body).toEqual(...)` assertions, following the Task 12 test style.

- [ ] **Step 2: Run to verify failure** — `npm run test -- company-jobs` → FAIL (functions missing).

- [ ] **Step 3: Implement** — append to `src/lib/services/company.ts`:

```ts
import { getJobPost, getJobPosts } from '@/lib/api/public'
import {
  deleteJobPost, deleteJobSkill, patchJobPost, patchJobSkill,
  postJobLocation, postJobPost, postJobSkill,
} from '@/lib/api/jobs'
import { ApiError } from '@/lib/api/client'
import { num } from './adapter-utils'
import type { JobPost, JobPostWriteBody } from '@/lib/api/types'
import type { CompanyJobDetail, CompanyJobInput, CompanyJobRow } from './types'

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
```

(Confirm `JobPost` DTO field names in `api/types.ts` — `job_type: { id, job_type_name }`, `required_skills: RequiredSkill[]`, `created_at` — and adjust property access to the real DTO if it differs. Export the new pieces from the barrel.)

- [ ] **Step 4: Run** — `npm run test` + `npm run typecheck` — green.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/services
git commit -m "feat(services): company jobs adapters and saveJob composite with id-keyed skill diffing"
```

---

### Task 14: Services — applicant on applications + applicant detail composite

**Files:**
- Modify: `src/lib/services/applications.ts`, `src/lib/services/seeker.ts` (export the three entry adapters), `src/lib/services/types.ts`, `src/lib/services/index.ts`
- Test: extend `src/lib/services/__tests__/` applications tests (find the existing file; add cases there or a sibling `applicant-detail.test.ts`)

**Interfaces (produced — Tasks 15/17 consume):**

```ts
// services/types.ts: ApplicationWithJob gains
applicant: { id: string; name: string } | null

export interface ApplicantProfile {
  name: string; goals: string; contactDetails: string; resumeUrl: string
  skills: { name: string; level: string }[]
  education: Education[]; experience: Experience[]
}
export interface ApplicantDetail {
  application: ApplicationWithJob
  profile: ApplicantProfile | null   // null when the seeker profile/dashboard 404s
  userId: string
}

// services/applications.ts additions
export async function getApplicantDetail(applicationId: string): Promise<ApplicantDetail | null>  // application 404 → null
export async function setApplicantStatus(applicationId: string, status: 'reviewed' | 'accepted' | 'rejected'): Promise<void>

// services/seeker.ts: adaptEducation, adaptExperience, adaptSkill become exported (unchanged bodies)
```

- [ ] **Step 1: Write the failing tests**

```ts
// in the applications services test file:
// 1. adaptApplication carries applicant {id, name: 'Avery Quinn'} from the dto
//    (name = `${first_name} ${last_name}`.trim())
// 2. applicant null in dto → applicant null in view model
// 3. getApplicantDetail: happy path joins /jobs/job-applications/:id/ +
//    /seekers/dashboard/:userId/ → profile { name, goals, contactDetails,
//    resumeUrl, skills:[{name, level}], education, experience }
// 4. getApplicantDetail: dashboard 404 → { application, profile: null, userId }
// 5. getApplicantDetail: application 404 → null
// 6. getApplicantDetail: dashboard 500 → rejects (transient errors are NOT
//    swallowed into the null-profile state)
// 7. setApplicantStatus PATCHes {application_status}
```

Write each as a real `it(...)` with MSW overrides (`seekerDashboard()` fixture exists; the 404 override returns `HttpResponse.json({ error: 'Profile not found' }, { status: 404 })`).

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

`applications.ts` — extend `adaptApplication`:

```ts
    applicant: dto.applicant
      ? { id: dto.applicant.id, name: `${dto.applicant.first_name} ${dto.applicant.last_name}`.trim() }
      : null,
```

Add:

```ts
import { getSeekerDashboard } from '@/lib/api/seekers'
import { adaptEducation, adaptExperience, adaptSkill } from './seeker'
import type { ApplicantDetail, ApplicantProfile } from './types'

export async function getApplicantDetail(applicationId: string): Promise<ApplicantDetail | null> {
  let dto: ApplicationReadDto
  try {
    dto = await getApplicationById(applicationId)
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
  let profile: ApplicantProfile | null = null
  try {
    const dash = await getSeekerDashboard(dto.user_account)
    profile = {
      name: `${dash.profile.first_name} ${dash.profile.last_name}`.trim(),
      goals: dash.profile.goals,
      contactDetails: dash.profile.contact_details,
      resumeUrl: dash.profile.resume_url,
      skills: dash.skills.map((s) => ({ name: s.skill_set.skill_name, level: s.skill_level })),
      education: dash.education.map(adaptEducation),
      experience: dash.experience.map(adaptExperience),
    }
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) throw err
    // profile deleted → keep the application, page renders the fallback (spec B1's defensive case)
  }
  return { application: adaptApplication(dto), profile, userId: dto.user_account }
}

export async function setApplicantStatus(
  applicationId: string,
  status: 'reviewed' | 'accepted' | 'rejected',
): Promise<void> {
  await patchApplicationStatus(applicationId, status)
}
```

(Match `getSeekerDashboard`'s actual response DTO — it's the Slice 3 shape in `api/types.ts`; if `dash.skills` entries differ (`adaptSkill` exists for a reason), use `adaptSkill` and map its output to `{name, level}`. In `seeker.ts`, add `export` to `adaptEducation`/`adaptExperience`/`adaptSkill` — no body changes.)

- [ ] **Step 4: Run** — full suite + typecheck green. The `applicant` addition to `ApplicationWithJob` may require updating Slice 3 fixture-based expectations — additive only; report any test you touch.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/services
git commit -m "feat(services): applicant identity on applications; applicant-detail composite with null-profile fallback"
```

---

### Task 15: Pages — company dashboard + jobs list

**Files:**
- Modify: `src/pages/company/dashboard.tsx`, `src/pages/company/jobs.tsx`
- Test: `src/pages/company/__tests__/dashboard.test.tsx`, `src/pages/company/__tests__/jobs.test.tsx` (create; reuse the authenticated-page test harness from the Slice 3 seeker page tests — same render helpers/providers — with `server.use(http.get('*/api/v1/accounts/me/', () => HttpResponse.json(companyAccount())))` to run as a company)

**Interfaces:**
- Consumes: `getCompanyConsole`, `listCompanyJobs`, `setJobPublished`, `deleteJob` (Tasks 12-13), `listApplications` (existing, now with `applicant`).
- Produces: query keys `['company-console']`, `['company-jobs']`; shared `['applications']`.

- [ ] **Step 1: Write the failing tests**

Dashboard: renders the three stat values from the console fixture (3/12/4); renders up to 5 recent applicants sorted newest-first with `applicant?.name || 'Applicant'`, job title, status badge; rows link to `/company/applicants/<applicationId>`.
Jobs: renders a row per job with title/type/salary/published badge; **applicant count column** equals the count of applications with that `jobId` in the fixture; publish-toggle fires PATCH `is_published` and invalidates (assert via request capture + `queryClient.invalidateQueries` spy or refetch observation); delete fires DELETE and the row disappears after refetch.

- [ ] **Step 2: Run to verify failure** (pages still import `@/lib/mock/services`).

- [ ] **Step 3: Implement `dashboard.tsx`** — replace the mock imports/queries:

```tsx
import { getCompanyConsole, listApplications } from '@/lib/services'

const { data: console_ } = useQuery({ queryKey: ['company-console'], queryFn: getCompanyConsole })
const { data: apps } = useQuery({ queryKey: ['applications'], queryFn: listApplications })

const stats = console_?.stats
const recent = [...(apps ?? [])]
  .sort((a, b) => b.applied.localeCompare(a.applied))
  .slice(0, 5)
```

Stat cards read `stats?.activePosts ?? 0`, `stats?.totalApplicants ?? 0`, `stats?.newThisWeek ?? 0` (keep the existing loading skeleton pattern the page already has). Recent table cells: `a.applicant?.name || 'Applicant'`, `a.job?.title ?? '—'`, `formatDate(a.applied)`, `<StatusBadge status={a.status} />`, link `/company/applicants/${a.id}`.

- [ ] **Step 4: Implement `jobs.tsx`:**

```tsx
import { deleteJob, getCompanyConsole, listApplications, listCompanyJobs, setJobPublished } from '@/lib/services'

const { data: console_ } = useQuery({ queryKey: ['company-console'], queryFn: getCompanyConsole })
const companyId = console_?.companyId
const { data: jobs, isLoading } = useQuery({
  queryKey: ['company-jobs'],
  queryFn: () => listCompanyJobs(companyId as string),
  enabled: Boolean(companyId),
})
const { data: apps } = useQuery({ queryKey: ['applications'], queryFn: listApplications })
const countByJob = new Map<string, number>()
for (const a of apps ?? []) countByJob.set(a.jobId, (countByJob.get(a.jobId) ?? 0) + 1)
```

Row fields: `j.title`, `money(j.salaryMin, j.salaryMax, j.salaryType)` (helper already in the file), `j.type`, `countByJob.get(j.id) ?? 0`, published badge from `j.published`. Mutations:

```tsx
const toggle = useMutation({
  mutationFn: (j: CompanyJobRow) => setJobPublished(j.id, !j.published),
  onSuccess: (_d, j) => {
    invalidate() // qc.invalidateQueries ['company-jobs'] + ['company-console']
    toast(j.published ? 'Job closed' : 'Job published')
  },
})
const remove = useMutation({
  mutationFn: (id: string) => deleteJob(id),
  onSuccess: () => {
    invalidate()
    qc.invalidateQueries({ queryKey: ['applications'] }) // cascade deletes applications
    toast('Job deleted')
  },
})
```

(Keep the page's existing layout/JSX; only the data seam and the count source change. The `['company-stats']` key is dead — do not invalidate it.)

- [ ] **Step 5: Run** — page tests + full suite + typecheck green.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/company/dashboard.tsx src/pages/company/jobs.tsx src/pages/company/__tests__
git commit -m "feat(company): dashboard and jobs list on real API with derived applicant counts"
```

---

### Task 16: Page — post/edit job

**Requires:** PR 0 merged and `origin/staging` merged into `feat/slice4-company` (Task 1 note) — do this first if not yet done.

**Files:**
- Modify: `src/pages/company/post-job.tsx` (full data-seam rewrite; keep layout/JSX structure)
- Test: `src/pages/company/__tests__/post-job.test.tsx` (create)

**Interfaces:**
- Consumes: `getCompanyJob`, `saveJob`, `JobSaveError` (Task 13), `listJobTypeOptions` (Task 12), `SALARY_TYPES`, `SKILL_LEVELS` (Task 12), `ApiError.fieldErrors`.

- [ ] **Step 1: Write the failing tests** — cases:

1. Create: fill title/description/type/city/country/salary/skills → submit → asserts the location POST, job-post POST (exact body incl. `salary_type: ''` when "Not specified" chosen and `deadline_date: null` when empty — the wire asymmetry), and one skill POST per row; navigates to `/company/jobs`.
2. Edit: loads `['company-job', id]`, prefills; a persisted skill row's name input is **disabled**; new rows' name inputs are editable.
3. Partial failure (skill POST 500): toast shown, create-mode navigates to `/company/jobs/<id>/edit`.
4. Field errors: job-post POST 400 `{job_title: ['Too long']}` renders inline at the title input; location POST 400 `{city: ['This field is required.']}` renders at the city input.
5. City/country inputs are `required`.

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement.** Key deltas (keep the surrounding JSX; adjust bindings):

```tsx
import { getCompanyJob, saveJob, JobSaveError } from '@/lib/services'
import { listJobTypeOptions } from '@/lib/services/meta'
import { SALARY_TYPES, SKILL_LEVELS } from '@/lib/services/enums'
import { ApiError } from '@/lib/api/client'
import type { CompanyJobInput, CompanyJobSkillRow, SalaryType, SkillLevel } from '@/lib/services'

interface Form {
  title: string; description: string; typeId: string; city: string; country: string
  salaryMin: string; salaryMax: string; salaryType: SalaryType | ''; deadline: string
  published: boolean; skills: CompanyJobSkillRow[]
}
const EMPTY: Form = {
  title: '', description: '', typeId: '', city: '', country: '',
  salaryMin: '', salaryMax: '', salaryType: '', deadline: '', published: true, skills: [],
}
```

- Job-type select: `useQuery({ queryKey: ['job-type-options'], queryFn: listJobTypeOptions })`, options `<option value={t.id}>{t.name}</option>`; when creating and `typeId` is empty, default to the first option once loaded.
- Salary-type select: first option `<option value="">Not specified</option>`, then `SALARY_TYPES`.
- Skill rows: `{ id: null, name: '', level: 'Intermediate', required: true }` for new rows; persisted rows (`id !== null`) render the name `<Input disabled />` (rename = remove + add, per spec).
- City/country `<Input required />`; the `country || '—'` fallback and the `TODO(slice-4)` block are deleted — edit prefill maps `existing.salaryType ?? ''` and `existing.deadline ?? ''` at the **form** boundary only.
- Submit:

```tsx
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
const invalidate = () => {
  qc.invalidateQueries({ queryKey: ['company-jobs'] })
  qc.invalidateQueries({ queryKey: ['company-console'] })
  if (isEdit) qc.invalidateQueries({ queryKey: ['company-job', id] })
}
const toInput = (): CompanyJobInput => ({
  title: form.title, description: form.description, typeId: form.typeId,
  city: form.city, country: form.country,
  salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
  salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
  salaryType: form.salaryType || null,
  deadline: form.deadline || null,
  published: form.published,
  skills: form.skills.filter((s) => s.name.trim()),
})
const save = useMutation({
  mutationFn: () => saveJob(toInput(), isEdit ? existing ?? undefined : undefined),
  onSuccess: () => {
    invalidate()
    toast(isEdit ? 'Job updated' : 'Job posted')
    navigate('/company/jobs')
  },
  onError: (err) => {
    if (err instanceof JobSaveError) {
      invalidate()
      qc.invalidateQueries({ queryKey: ['company-job', err.jobId] })
      toast('Job saved, but some skills failed — review and retry')
      if (!isEdit) navigate(`/company/jobs/${err.jobId}/edit`)
      return
    }
    if (err instanceof ApiError && err.fieldErrors) {
      const map: Record<string, string> = {
        job_title: 'title', job_description: 'description', job_type: 'typeId',
        salary_min: 'salaryMin', salary_max: 'salaryMax', salary_type: 'salaryType',
        deadline_date: 'deadline', city: 'city', country: 'country',
      }
      const next: Record<string, string> = {}
      for (const [k, msgs] of Object.entries(err.fieldErrors)) {
        next[map[k] ?? k] = Array.isArray(msgs) ? msgs.join(' ') : String(msgs)
      }
      setFieldErrors(next)
      return
    }
    toast('Could not save the job — try again')
  },
})
```

Render each field's error under its input (`{fieldErrors.title && <p className="mt-1 text-sm text-destructive">{fieldErrors.title}</p>}` — match how login/register render field errors).

- [ ] **Step 4: Run** — tests + suite + typecheck green.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/company/post-job.tsx src/pages/company/__tests__/post-job.test.tsx
git commit -m "feat(company): post/edit job on real API — location create, skill diffing, partial-failure recovery"
```

---

### Task 17: Pages — applicants list + applicant detail

**Files:**
- Modify: `src/pages/company/applicants.tsx`, `src/pages/company/applicant-detail.tsx`
- Test: `src/pages/company/__tests__/applicants.test.tsx`, `src/pages/company/__tests__/applicant-detail.test.tsx` (create)

**Interfaces:**
- Consumes: `listApplications`, `getApplicantDetail`, `setApplicantStatus` (Task 14), `listCompanyJobs` + `getCompanyConsole` (Tasks 12-13). Query keys: shared `['applications']`, `['application-detail', id]`, `['company-jobs']`, `['company-console']`.

- [ ] **Step 1: Write the failing tests** — cases:

Applicants list: renders `applicant?.name || 'Applicant'`, job-title badge, applied date, status badge (no "title · N yrs" line); `?job=<id>` search param filters client-side; Accept/Reject enabled for `pending`/`reviewed`, disabled for `accepted`/`rejected`; a `withdrawn` row shows the badge and **no** action buttons; clicking Accept PATCHes and invalidates `['applications']` + `['application-detail']`.
Detail: happy path renders name, contact details, resume link (`href`), goals, skills chips, experience + education entries, cover letter; `pending` shows Mark reviewed + Accept + Reject; `reviewed` shows Accept + Reject only; `accepted`/`withdrawn` show none; profile-null mode (dashboard 404 override) keeps the status actions and shows the profile empty-state note; unknown application id renders the not-found state.

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement `applicants.tsx`:** data seam becomes

```tsx
const { data: console_ } = useQuery({ queryKey: ['company-console'], queryFn: getCompanyConsole })
const { data: jobs } = useQuery({
  queryKey: ['company-jobs'],
  queryFn: () => listCompanyJobs(console_?.companyId as string),
  enabled: Boolean(console_?.companyId),
})
const { data: apps, isLoading } = useQuery({ queryKey: ['applications'], queryFn: listApplications })
const visible = jobId ? (apps ?? []).filter((a) => a.jobId === jobId) : apps ?? []
```

Job filter select options from `jobs`; card line: name (link to `/company/applicants/${a.id}`), `<Badge>{a.job?.title ?? 'Role'}</Badge>`, `Applied {formatDate(a.applied)}`, `<StatusBadge status={a.status} />`. Actions:

```tsx
const canAct = (s: AppStatus) => s === 'pending' || s === 'reviewed'
const setStatus = useMutation({
  mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) =>
    setApplicantStatus(id, status),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['applications'] })
    qc.invalidateQueries({ queryKey: ['application-detail'] })
  },
})
// render Accept/Reject only when a.status !== 'withdrawn'; disabled={!canAct(a.status)}
```

- [ ] **Step 4: Implement `applicant-detail.tsx`:**

```tsx
const { data, isLoading } = useQuery({
  queryKey: ['application-detail', id],
  queryFn: () => getApplicantDetail(id as string),
})
// data === null → not-found state (mirror seeker application-detail's pattern)
const app = data?.application
const profile = data?.profile
const name = profile?.name || app?.applicant?.name || 'Applicant'
```

Sections: header (name + StatusBadge + actions), job link `/jobs/${app.jobId}` with `app.job?.title ?? 'Role removed'`, contact card (`profile.contactDetails` or '—'; resume link `<a href={profile.resumeUrl}>View resume</a>` only when non-empty), goals, skills chips `{s.name} · {s.level}`, experience list (`title` — `company`, dates), education list (degree — institution, dates — reuse the field names of the `Education`/`Experience` view models from `services/types.ts`), cover letter (`whitespace-pre-wrap`). When `profile === null` and the application loaded: render the info note `"This candidate's profile is no longer available."` in place of the profile sections — status actions stay. Actions by matrix:

```tsx
const actions = useMutation({
  mutationFn: (status: 'reviewed' | 'accepted' | 'rejected') => setApplicantStatus(id as string, status),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['application-detail', id] })
    qc.invalidateQueries({ queryKey: ['applications'] })
  },
})
// pending: Mark reviewed / Accept / Reject; reviewed: Accept / Reject; otherwise none
```

- [ ] **Step 5: Run** — tests + suite + typecheck green.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/company/applicants.tsx src/pages/company/applicant-detail.tsx src/pages/company/__tests__
git commit -m "feat(company): applicants list and detail on real API — transition matrix, profile fallback"
```

---

### Task 18: Page — company profile

**Requires:** PR 0 merged into the branch (modal is used by the image dialog).

**Files:**
- Modify: `src/pages/company/profile.tsx`
- Test: `src/pages/company/__tests__/profile.test.tsx` (create)

**Interfaces:**
- Consumes: `getCompanyConsole`, `updateCompanyProfile`, `addCompanyImage`, `removeCompanyImage` (Task 12), `listStreamOptions` (Task 12), `refreshUser` from `useAuth()`.

- [ ] **Step 1: Write the failing tests** — cases: renders console data (name/website/description, stream select bound to `streamId` with options from the streams fixture); save PATCHes the mapped body **and calls `refreshUser`** (assert via a spied auth context or by asserting the follow-up `/accounts/me/`+dashboard refetch the real `refreshUser` performs — pick whichever the Slice 3 tests' auth harness supports); status toggle: active⇄inactive sends `{status}`; `suspended` fixture renders the "Suspended by admin" badge, no toggle, other fields still editable; add-image modal POSTs `{image_url}` and invalidates; remove button DELETEs by **image id**.

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement.** Data seam:

```tsx
import { addCompanyImage, getCompanyConsole, removeCompanyImage, updateCompanyProfile } from '@/lib/services'
import { listStreamOptions } from '@/lib/services/meta'
import { useAuth } from '@/lib/auth/auth-context'

const { refreshUser } = useAuth()
const { data: console_, isLoading } = useQuery({ queryKey: ['company-console'], queryFn: getCompanyConsole })
const { data: streams } = useQuery({ queryKey: ['stream-options'], queryFn: listStreamOptions })

interface ProfileForm { name: string; streamId: string; status: CompanyStatus; website: string; description: string }
// initialize from console_ once loaded (useEffect, same pattern the page already uses)

const save = useMutation({
  mutationFn: () => updateCompanyProfile(console_!.companyId, {
    name: form.name, streamId: form.streamId, status: form.status,
    website: form.website, description: form.description,
  }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['company-console'] })
    void refreshUser() // topbar shows the company name — a rename must reach the session
    toast('Company profile saved')
  },
})
```

- Stream select: `<option value={s.id}>{s.name}</option>` bound to `form.streamId`.
- Status control: when `console_.status === 'suspended'` → render a badge `Suspended by admin` + note `Contact support to restore your listing.` and DO NOT render the toggle (keep `form.status` as-is so saves don't send a change). Otherwise a labeled Checkbox:

```tsx
<label className="flex items-center gap-2 text-sm font-medium">
  <Checkbox
    checked={form.status === 'active'}
    onChange={(e) => set('status', e.target.checked ? 'active' : 'inactive')}
  />
  Visible in the public directory
</label>
```

- Gallery: `console_.images` (`{id, url}`): `<img src={img.url} />`, remove → `removeImg.mutate(img.id)`; add modal unchanged except `addImg` calls `addCompanyImage(imageUrl.trim())`; both invalidate `['company-console']`.

- [ ] **Step 4: Run** — tests + suite + typecheck green.

- [ ] **Step 5: Commit**

```powershell
git add src/pages/company/profile.tsx src/pages/company/__tests__/profile.test.tsx
git commit -m "feat(company): profile page on real API — stream options, status toggle, images by id, session refresh"
```

---

### Task 19: Public publish filters + mock deletion + type re-pointing

**Files:**
- Modify: `src/lib/services/jobs.ts` (`listJobs`, `listCompanyRoles` pass `is_published: true, is_active: true`), `src/lib/services/types.ts` (add `UserType`), `src/lib/auth/session.ts`, `src/components/layout/require-auth.tsx`, `src/pages/auth/register.tsx`, `src/components/ui/status-badge.tsx`, `src/pages/settings.tsx`, `src/pages/seeker/profile.tsx`, `src/components/layout/console-layout.tsx:62`
- Delete: `src/lib/mock/` (entire directory: `services.ts`, `data.ts`, `store.ts`, `types.ts`)
- Test: extend the jobs services tests (filter params); the whole suite + typecheck prove the deletion.

**Interfaces:**
- Produces: `export type UserType = 'job_seeker' | 'company'` from `src/lib/services/types.ts` (re-exported by the barrel); zero imports from `@/lib/mock` anywhere.

- [ ] **Step 1: Failing test first** — in the jobs services tests, assert `listJobs()` and `listCompanyRoles('cid')` include `is_published=true&is_active=true` in the request URL (MSW capture of `request.url` search params).

- [ ] **Step 2: Implement the filter params** in `src/lib/services/jobs.ts` — add `is_published: true, is_active: true` to the `getJobPosts` params in both functions (public browse must never show drafts to the browsing owner — spec B8).

- [ ] **Step 3: Move `UserType`** to `src/lib/services/types.ts`; re-point importers (`session.ts:10`, `require-auth.tsx:3`, `register.tsx:10`) to `@/lib/services` (or `@/lib/services/types` — match each file's existing import style). `status-badge.tsx:4` imports `AppStatus` from `@/lib/services`.

- [ ] **Step 4: Re-point enum consumers** — `settings.tsx:5` and `seeker/profile.tsx:15` replace `ENUMS` usages with the Task 12 constants (`SEX_OPTIONS`, `DEGREE_TYPES`, `SKILL_LEVELS` — map each `ENUMS.x` usage to its constant).

- [ ] **Step 5: Delete the mock layer**

```powershell
git rm -r src/lib/mock
```

- [ ] **Step 6: Console layout fallback** — `console-layout.tsx:62`: `{user?.name ?? 'Your company'}`.

- [ ] **Step 7: Prove it**

Run: `npm run typecheck` (must be clean — this is the deletion proof), `npm run test` (all green), and verify zero references:

```powershell
Get-ChildItem -Recurse src -Include *.ts,*.tsx | Select-String -Pattern "lib/mock" -List
```

Expected: no output.

- [ ] **Step 8: Commit**

```powershell
git add -A
git commit -m "refactor: delete the mock backend; public browse pins published+active; types re-pointed to services"
```

---

### Task 20: Finalize — full gates, PR, live e2e

**Requires:** backend PR (Task 10) merged into backend `staging` by the user; PR 0 merged.

- [ ] **Step 1: Full local gates** — `npm run typecheck`, `npm run test`, `npm run build` — all green.

- [ ] **Step 2: Push + PR**

```powershell
git -c credential.helper= -c credential.helper='!gh auth git-credential' push -u origin feat/slice4-company
gh pr create --repo Dreyyy25/workframe-web --base staging --head feat/slice4-company --title "feat: slice-4 company console on real API; mock layer deleted" --body "Implements docs/superpowers/specs/2026-08-10-slice4-company-console-design.md: all six console pages on the real backend (console composite, saveJob with id-keyed skill diffing, transition-matrix actions, suspended mode), applicant identity without email exposure, public browse pinned to published+active, src/lib/mock deleted, types re-pointed. Companion backend PR: Job-Board-API-only feat/slice4-company-console."
```

- [ ] **Step 3: Live e2e** — start backend (`uv run python manage.py runserver` in the backend repo on updated `staging`) + `npm run dev`, then walk the spec §7 checklist (12 steps) in a real browser and record pass/fail per step:

1. Register a company → console dashboard; name in topbar.
2. Complete profile → public directory reflects it.
3. Add image by URL → gallery + public detail; remove works.
4. Post a job (new skills, salary, deadline, published) → console list + public board.
5. Draft → absent publicly (check anonymous AND the company's own public browse); edit draft; publish → appears.
6. Seeker applies → stats tick up; recent applicants shows the name.
7. Applicants list + filter by job; detail shows contact/resume/skills/cover.
8. pending → reviewed → accepted; buttons follow the matrix; seeker sees the change.
9. Toggle inactive → gone from the directory (jobs stay on the board — accepted); re-activate → back.
10. Company session on public `/jobs` → all published jobs, not just its own.
11. Delete a job → gone everywhere; counts update.
12. Regression: seeker area + public browse unchanged; both suites green.

- [ ] **Step 4: Report** — PR URLs, e2e results table, any deviations from spec (each flagged with the spec section).

---

## Self-Review Notes (already applied)

- Spec coverage: B1→T4, B2→T5, B3→T6, B4→T7, B5→T8, B6→T2, B7→T9, B8→T3+T19; §4 PR0→T1, api/services→T11-14; §5 pages→T15-18; §6 deletion→T19; §7 gates/e2e→T10/T20.
- The `['company-stats']` key must not survive anywhere (T15/T16 explicitly drop it).
- Wire asymmetry (`salary_type ''` / `deadline null`) is enforced in `toWireBody` (T13) and pinned by tests in T13 and T16.
- No task re-adds model-level ordering (B5 false-premise fix from the spec review).
