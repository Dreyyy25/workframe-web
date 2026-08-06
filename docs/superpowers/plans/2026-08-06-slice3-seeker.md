# Slice 3 — Seeker Area on Real Data: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seeker dashboard, applications, profile, settings, and the apply flow run on real backend data; the backend gains nested application/skill reads, an applications-viewset lockdown, skill get-or-create, and verified change-password; Slice-2 deferred cleanup lands.

**Architecture:** Backend work happens in a **git worktree** off `staging` (branch `feat/seeker-applications`) and lands via PR — never merged directly. Frontend work continues on `feat/slice3-seeker` (already created, carries the spec). Frontend `src/lib/services/` gains `seeker.ts` + `applications.ts` adapters over new `src/lib/api/` modules, mirroring the Slice-2 pattern. Spec: `docs/superpowers/specs/2026-08-06-slice3-seeker-design.md`.

**Tech Stack:** Django 5 + DRF + simplejwt (backend, `uv run`), React 18 + TS + TanStack Query v5 + Vitest 2/MSW 2 (frontend).

## Global Constraints

- Conventional commits; **never** a `Co-Authored-By: Claude` trailer, in either repo.
- **Never merge into `staging`/`main`** — PRs only; both repos have a required `ci` check.
- Backend worktree: `C:/Users/almos/Projects/job-board-api-slice3` — the main backend checkout (`C:/Users/almos/Projects/Job-Board-API-only`, on `staging`) is never touched.
- Backend: `uv run python manage.py test` green at each backend task end (run from the worktree). Frontend: `npm run test` + `npm run typecheck` green at each frontend task end.
- Services return `null` for missing entities, never `undefined`.
- Wire truth: decimals are JSON strings; datetimes ISO; `{count,next,previous,results}` envelopes on viewset lists; `page_size` ≤ 100; error shapes `{detail}`, `{error}`, or field-keyed dicts (the Slice-1 `ApiError` normalizes all three).
- MSW: `onUnhandledRequest: 'error'`; protected endpoints gate through the existing `denyUnlessAuthed`.
- Do not change `src/lib/mock/` runtime behavior — type re-imports only. `ENUMS` from `mock/data.ts` stays as the selects' static option source.
- tsconfig `lib: ES2020` — no `Array.prototype.at`; use `arr[arr.length - 1]!`.

---

### Task 1: Backend worktree + baseline

**Files:** none in-repo (worktree creation only).

- [ ] **Step 1: Create the worktree and branch**

```bash
git -C "C:/Users/almos/Projects/Job-Board-API-only" worktree add "C:/Users/almos/Projects/job-board-api-slice3" -b feat/seeker-applications staging
cp "C:/Users/almos/Projects/Job-Board-API-only/.env" "C:/Users/almos/Projects/job-board-api-slice3/.env"
```

- [ ] **Step 2: Baseline green**

Run from `C:/Users/almos/Projects/job-board-api-slice3`: `uv run python manage.py test 2>&1 | tail -4`
Expected: `Ran 449 tests ... OK` (uv resolves the environment on first run). If a stale `test_job_board` DB blocks with "being accessed by other users", drop it first (see the Slice-2 note: connect to the dev DB with autocommit and `DROP DATABASE IF EXISTS test_job_board`).

No commit (nothing changed).

---

### Task 2: Backend — nested application + seeker-skill reads

**Files:**
- Modify: `apps/jobs/serializers.py`, `apps/jobs/views.py` (JobPostActivityViewSet + user_applications), `apps/jobs/managers.py` (JobPostActivityQuerySet.with_related)
- Modify: `apps/seekers/serializers.py`, `apps/seekers/views.py` (SeekerSkillSetViewSet), `apps/seekers/services.py` (build_seeker_dashboard)
- Test: `apps/jobs/tests.py`, `apps/seekers/tests.py`

**Interfaces:**
- Produces (frontend Tasks 7–9 rely on these exact shapes): application list/retrieve items with nested `job_post` `{id, job_title, company {id, company_name}, job_type {id, job_type_name}, job_location {city, country}, salary_min, salary_max, salary_type, deadline_date, is_published, is_active}`; seeker-skill list/retrieve + dashboard `skills` items with nested `skill_set {id, skill_name, created_at}`. Write shapes unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `apps/jobs/tests.py` (imports at top of file already include the models/APITestCase pattern — follow `JobPostNestedReadTests` for fixture style):

```python
class ApplicationNestedReadTests(APITestCase):
    """List/retrieve applications return a nested job_post summary; write shape unchanged."""

    def setUp(self):
        self.seeker = UserAccount.objects.create_user(
            email='nested-seeker@example.com', password='Str0ng-Password!', user_type='job_seeker')
        self.company_user = UserAccount.objects.create_user(
            email='nested-co@example.com', password='Str0ng-Password!', user_type='company')
        company = Company.objects.get(user_account=self.company_user)
        company.company_name = 'Nested Co'
        company.save()
        jt = JobType.objects.create(job_type_name='Full-time')
        loc = JobLocation.objects.create(city='Berlin', country='Germany')
        self.job = JobPost.objects.create(
            company=company, job_type=jt, job_location=loc, job_title='ML Engineer',
            job_description='d', salary_min=90000, salary_max=120000, salary_type='yearly')
        self.app = JobPostActivity.objects.create(user_account=self.seeker, job_post=self.job)
        refresh = RefreshToken.for_user(self.seeker)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_list_returns_nested_job_post_summary(self):
        r = self.client.get('/api/v1/jobs/job-applications/')
        self.assertEqual(r.status_code, 200)
        row = r.data['results'][0]
        self.assertEqual(row['job_post'], {
            'id': str(self.job.id),
            'job_title': 'ML Engineer',
            'company': {'id': str(self.job.company_id), 'company_name': 'Nested Co'},
            'job_type': {'id': str(self.job.job_type_id), 'job_type_name': 'Full-time'},
            'job_location': {'city': 'Berlin', 'country': 'Germany'},
            'salary_min': '90000.00', 'salary_max': '120000.00', 'salary_type': 'yearly',
            'deadline_date': None, 'is_published': True, 'is_active': True,
        })

    def test_unpublished_job_still_nested_for_the_applicant(self):
        self.job.is_published = False
        self.job.save()
        r = self.client.get(f'/api/v1/jobs/job-applications/{self.app.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['job_post']['job_title'], 'ML Engineer')
        self.assertFalse(r.data['job_post']['is_published'])

    def test_user_applications_view_is_nested_too(self):
        r = self.client.get(f'/api/v1/jobs/applications/user/{self.seeker.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data[0]['job_post']['company']['company_name'], 'Nested Co')

    def test_list_query_count_is_flat(self):
        for i in range(10):
            u = UserAccount.objects.create_user(
                email=f'ns{i}@example.com', password='Str0ng-Password!', user_type='job_seeker')
            JobPostActivity.objects.create(user_account=u, job_post=self.job)
        staff = UserAccount.objects.create_user(
            email='ns-admin@example.com', password='Str0ng-Password!', user_type='job_seeker')
        staff.is_staff = True
        staff.save()
        refresh = RefreshToken.for_user(staff)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        with self.assertNumQueries(3):  # count + page + auth user lookup
            self.client.get('/api/v1/jobs/job-applications/?page_size=50')
```

(Adjust the exact `assertNumQueries` number to what the first green run measures, then pin it — the point is a constant independent of row count. If auth adds queries, measure once and fix the constant.)

Append to `apps/seekers/tests.py`:

```python
class SeekerSkillNestedReadTests(APITestCase):
    def setUp(self):
        self.seeker = UserAccount.objects.create_user(
            email='skill-seeker@example.com', password='Str0ng-Password!', user_type='job_seeker')
        self.skill = SkillSet.objects.create(skill_name='Python')
        self.row = SeekerSkillSet.objects.create(
            user_account=self.seeker, skill_set=self.skill, skill_level='Advanced')
        refresh = RefreshToken.for_user(self.seeker)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def test_list_nests_skill_name(self):
        r = self.client.get('/api/v1/seekers/seeker-skills/')
        row = r.data['results'][0]
        self.assertEqual(row['skill_set']['skill_name'], 'Python')
        self.assertEqual(row['skill_level'], 'Advanced')

    def test_dashboard_skills_nest_skill_name(self):
        r = self.client.get(f'/api/v1/seekers/dashboard/{self.seeker.id}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data['skills'][0]['skill_set']['skill_name'], 'Python')
```

- [ ] **Step 2: Run to verify failure**

`uv run python manage.py test apps.jobs.tests.ApplicationNestedReadTests apps.seekers.tests.SeekerSkillNestedReadTests` — FAIL (bare UUIDs in `job_post` / `skill_set`).

- [ ] **Step 3: Implement — jobs side**

`apps/jobs/serializers.py` — add after `JobPostSkillSetReadSerializer` (reuses the existing `CompanyRefSerializer` and `JobTypeRefSerializer`):

```python
class JobLocationRefSerializer(serializers.ModelSerializer):
    """City/country only — the application screens need no more."""

    class Meta:
        model = JobLocation
        fields = ['city', 'country']
        read_only_fields = fields


class ApplicationJobPostSerializer(serializers.ModelSerializer):
    """Lean job summary embedded in application reads. Embedding (rather than a
    client-side join) is what lets a seeker keep seeing details of a job that
    was unpublished after they applied."""

    company = CompanyRefSerializer(read_only=True)
    job_type = JobTypeRefSerializer(read_only=True)
    job_location = JobLocationRefSerializer(read_only=True)

    class Meta:
        model = JobPost
        fields = [
            'id', 'job_title', 'company', 'job_type', 'job_location',
            'salary_min', 'salary_max', 'salary_type', 'deadline_date',
            'is_published', 'is_active',
        ]
        read_only_fields = fields


class JobPostActivityReadSerializer(serializers.ModelSerializer):
    job_post = ApplicationJobPostSerializer(read_only=True)

    class Meta:
        model = JobPostActivity
        fields = [
            'id', 'user_account', 'job_post', 'application_date',
            'application_status', 'cover_letter', 'updated_at',
        ]
        read_only_fields = fields
```

`apps/jobs/managers.py` — extend `JobPostActivityQuerySet.with_related` to cover the new nesting:

```python
    def with_related(self):
        return self.select_related(
            'user_account', 'job_post', 'job_post__company',
            'job_post__job_type', 'job_post__job_location',
        )
```

`apps/jobs/views.py` — `JobPostActivityViewSet` gains (import `JobPostActivityReadSerializer`):

```python
    def get_serializer_class(self):
        """Nested read shape for list/retrieve; plain write shape otherwise."""
        if self.action in ('list', 'retrieve'):
            return JobPostActivityReadSerializer
        return JobPostActivitySerializer
```

`user_applications` switches its serializer to `JobPostActivityReadSerializer` (the service already returns `with_related()` querysets; its `@extend_schema` response updates too). `job_applications` (company view) switches the same way — companies get the same nested read.

- [ ] **Step 4: Implement — seekers side**

`apps/seekers/serializers.py` — add:

```python
class SeekerSkillSetReadSerializer(serializers.ModelSerializer):
    skill_set = SkillSetSerializer(read_only=True)

    class Meta:
        model = SeekerSkillSet
        fields = ['id', 'user_account', 'skill_set', 'skill_level']
        read_only_fields = fields
```

`apps/seekers/views.py` — `SeekerSkillSetViewSet` gains the same `get_serializer_class` pattern (read serializer for `list`/`retrieve`). In `apps/seekers/services.py`, `build_seeker_dashboard` serializes `skills` with `SeekerSkillSetReadSerializer` and its skills queryset adds `.select_related('skill_set')`.

- [ ] **Step 5: Run tests — expect PASS, then the full suite**

`uv run python manage.py test apps.jobs apps.seekers` then `uv run python manage.py test` — all green (existing `ApplicationTests` still pass: write shape untouched).

- [ ] **Step 6: Commit**

```bash
git add apps/jobs apps/seekers
git commit -m "feat(api): nested job summary on application reads, nested skill names on seeker skills"
```

---

### Task 3: Backend — applications viewset lockdown + status transitions

**Files:**
- Modify: `apps/jobs/serializers.py` (new update serializer), `apps/jobs/views.py` (JobPostActivityViewSet)
- Test: `apps/jobs/tests.py`

**Interfaces:**
- Produces: viewset POST → 405; PATCH/PUT accept only `application_status`, validated per the matrix: seeker-owner `pending|reviewed → withdrawn`; company job-owner `pending → reviewed|accepted|rejected`, `reviewed → accepted|rejected`; admin unrestricted; same-value writes allowed as no-ops. Violations → 400 `{"application_status": ["Cannot change status from '<cur>' to '<new>'."]}`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/jobs/tests.py`:

```python
class ApplicationLockdownTests(APITestCase):
    def setUp(self):
        self.seeker = UserAccount.objects.create_user(
            email='lock-seeker@example.com', password='Str0ng-Password!', user_type='job_seeker')
        self.other_seeker = UserAccount.objects.create_user(
            email='lock-other@example.com', password='Str0ng-Password!', user_type='job_seeker')
        self.company_user = UserAccount.objects.create_user(
            email='lock-co@example.com', password='Str0ng-Password!', user_type='company')
        company = Company.objects.get(user_account=self.company_user)
        jt = JobType.objects.create(job_type_name='Full-time')
        loc = JobLocation.objects.create(city='X', country='Y')
        self.job = JobPost.objects.create(
            company=company, job_type=jt, job_location=loc,
            job_title='T', job_description='d')
        self.app = JobPostActivity.objects.create(user_account=self.seeker, job_post=self.job)

    def _as(self, user):
        refresh = RefreshToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def _patch(self, status_value):
        return self.client.patch(
            f'/api/v1/jobs/job-applications/{self.app.id}/',
            {'application_status': status_value}, format='json')

    def test_viewset_post_is_gone(self):
        self._as(self.other_seeker)
        r = self.client.post('/api/v1/jobs/job-applications/', {
            'user_account': str(self.seeker.id), 'job_post': str(self.job.id),
            'application_status': 'accepted'}, format='json')
        self.assertEqual(r.status_code, 405)

    def test_update_cannot_move_the_application(self):
        self._as(self.seeker)
        r = self.client.patch(
            f'/api/v1/jobs/job-applications/{self.app.id}/',
            {'user_account': str(self.other_seeker.id), 'cover_letter': 'new',
             'application_status': 'withdrawn'}, format='json')
        self.assertEqual(r.status_code, 200)
        self.app.refresh_from_db()
        self.assertEqual(self.app.user_account_id, self.seeker.id)  # read-only ignored
        self.assertEqual(self.app.cover_letter, '')
        self.assertEqual(self.app.application_status, 'withdrawn')

    def test_seeker_transitions(self):
        self._as(self.seeker)
        self.assertEqual(self._patch('accepted').status_code, 400)   # self-accept blocked
        self.assertEqual(self._patch('withdrawn').status_code, 200)  # pending -> withdrawn OK
        self.assertEqual(self._patch('pending').status_code, 400)    # un-withdraw blocked

    def test_seeker_can_withdraw_from_reviewed(self):
        self.app.application_status = 'reviewed'
        self.app.save()
        self._as(self.seeker)
        self.assertEqual(self._patch('withdrawn').status_code, 200)

    def test_company_transitions(self):
        self._as(self.company_user)
        self.assertEqual(self._patch('withdrawn').status_code, 400)  # company can't withdraw
        self.assertEqual(self._patch('reviewed').status_code, 200)   # pending -> reviewed
        self.assertEqual(self._patch('pending').status_code, 400)    # no going back
        self.assertEqual(self._patch('accepted').status_code, 200)   # reviewed -> accepted

    def test_same_value_is_a_noop_200(self):
        self._as(self.seeker)
        self.assertEqual(self._patch('pending').status_code, 200)

    def test_admin_unrestricted(self):
        admin = UserAccount.objects.create_user(
            email='lock-admin@example.com', password='Str0ng-Password!', user_type='job_seeker')
        admin.is_staff = True
        admin.save()
        self._as(admin)
        self.assertEqual(self._patch('accepted').status_code, 200)
        self.assertEqual(self._patch('pending').status_code, 200)
```

- [ ] **Step 2: Run to verify failure**

`uv run python manage.py test apps.jobs.tests.ApplicationLockdownTests` — FAIL (POST 201, foreign fields writable, transitions unrestricted).

- [ ] **Step 3: Implement**

`apps/jobs/serializers.py` — add:

```python
_STATUS_TRANSITIONS = {
    # actor role -> {current status -> allowed next statuses}
    'seeker': {'pending': {'withdrawn'}, 'reviewed': {'withdrawn'}},
    'company': {'pending': {'reviewed', 'accepted', 'rejected'},
                'reviewed': {'accepted', 'rejected'}},
}


class JobPostActivityUpdateSerializer(serializers.ModelSerializer):
    """Only application_status is writable, and only along the allowed
    transitions for the caller's role. Everything else about an application
    is immutable after /jobs/apply/ creates it."""

    class Meta:
        model = JobPostActivity
        fields = [
            'id', 'user_account', 'job_post', 'application_date',
            'application_status', 'cover_letter', 'updated_at',
        ]
        read_only_fields = [
            'id', 'user_account', 'job_post', 'application_date',
            'cover_letter', 'updated_at',
        ]

    def validate_application_status(self, value):
        user = self.context['request'].user
        current = self.instance.application_status
        if value == current or user.is_staff or user.is_superuser:
            return value
        if user.id == self.instance.user_account_id:
            allowed = _STATUS_TRANSITIONS['seeker'].get(current, set())
        elif self.instance.job_post.company.user_account_id == user.id:
            allowed = _STATUS_TRANSITIONS['company'].get(current, set())
        else:
            allowed = set()  # unreachable via queryset narrowing; defense in depth
        if value not in allowed:
            raise serializers.ValidationError(
                f"Cannot change status from '{current}' to '{value}'.")
        return value
```

`apps/jobs/views.py` — `JobPostActivityViewSet`:

```python
    # Applications are created only through the validated /jobs/apply/ flow.
    http_method_names = ['get', 'put', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return JobPostActivityReadSerializer
        return JobPostActivityUpdateSerializer
```

(The old `JobPostActivitySerializer` remains for `/jobs/apply/`'s response only.)

- [ ] **Step 4: Fix broken existing tests**

`ApplicationTests` (tests.py:319) and any `JobsServiceTests`/`ApplyEndpointContractTests` cases that POST to `/job-applications/` or PATCH freely must be updated to the new contract (apply via `/jobs/apply/`, transitions per matrix). Update assertions — do not delete coverage.

- [ ] **Step 5: Run — expect PASS, full suite green, commit**

```bash
uv run python manage.py test
git add apps/jobs
git commit -m "fix(jobs): lock down application writes — no viewset create, immutable fields, role-based status transitions"
```

---

### Task 4: Backend — seeker skills: get-or-create by name, duplicate → 400, level-only updates

**Files:**
- Modify: `apps/seekers/serializers.py` (SeekerSkillSetSerializer)
- Test: `apps/seekers/tests.py`

**Interfaces:**
- Produces: `POST /seekers/seeker-skills/` accepts `{skill_name, skill_level}` (get-or-create, case-insensitive) or `{skill_set, skill_level}`; duplicate attach → 400 `{"skill_set": ["You already added this skill."]}`; PATCH accepts `skill_level` only (`skill_set` in a PATCH → 400).

- [ ] **Step 1: Write the failing tests**

```python
class SeekerSkillCreateByNameTests(APITestCase):
    def setUp(self):
        self.seeker = UserAccount.objects.create_user(
            email='sbn@example.com', password='Str0ng-Password!', user_type='job_seeker')
        refresh = RefreshToken.for_user(self.seeker)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def _post(self, body):
        return self.client.post('/api/v1/seekers/seeker-skills/', body, format='json')

    def test_new_name_creates_master_skill(self):
        r = self._post({'skill_name': 'Terraform', 'skill_level': 'Advanced'})
        self.assertEqual(r.status_code, 201)
        self.assertTrue(SkillSet.objects.filter(skill_name='Terraform').exists())

    def test_existing_name_reused_case_insensitively(self):
        existing = SkillSet.objects.create(skill_name='Python')
        r = self._post({'skill_name': 'python', 'skill_level': 'Expert'})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(SkillSet.objects.filter(skill_name__iexact='python').count(), 1)
        self.assertEqual(SeekerSkillSet.objects.get(user_account=self.seeker).skill_set_id, existing.id)

    def test_duplicate_attach_is_400_not_500(self):
        skill = SkillSet.objects.create(skill_name='SQL')
        SeekerSkillSet.objects.create(user_account=self.seeker, skill_set=skill, skill_level='Beginner')
        r = self._post({'skill_name': 'SQL', 'skill_level': 'Expert'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('already added', str(r.data['skill_set']))

    def test_neither_name_nor_id_is_400(self):
        r = self._post({'skill_level': 'Expert'})
        self.assertEqual(r.status_code, 400)

    def test_patch_level_only(self):
        skill = SkillSet.objects.create(skill_name='Go')
        row = SeekerSkillSet.objects.create(
            user_account=self.seeker, skill_set=skill, skill_level='Beginner')
        other = SkillSet.objects.create(skill_name='Rust')
        r = self.client.patch(f'/api/v1/seekers/seeker-skills/{row.id}/',
                              {'skill_set': str(other.id)}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.client.patch(f'/api/v1/seekers/seeker-skills/{row.id}/',
                              {'skill_level': 'Advanced'}, format='json')
        self.assertEqual(r.status_code, 200)
        row.refresh_from_db()
        self.assertEqual(row.skill_level, 'Advanced')
        self.assertEqual(row.skill_set_id, skill.id)
```

- [ ] **Step 2: Run to verify failure** (duplicate test currently 500s; name test 400s).

- [ ] **Step 3: Implement** — replace `SeekerSkillSetSerializer` with:

```python
class SeekerSkillSetSerializer(serializers.ModelSerializer):
    """Write serializer. Create accepts either an existing skill_set UUID or a
    free-text skill_name (get-or-create, case-insensitive — the master list
    grows organically). Updates may change skill_level only."""

    skill_name = serializers.CharField(
        write_only=True, required=False, max_length=100, allow_blank=False)

    class Meta:
        model = SeekerSkillSet
        fields = ['id', 'user_account', 'skill_set', 'skill_level', 'skill_name']
        read_only_fields = ['id', 'user_account']
        extra_kwargs = {'skill_set': {'required': False}}

    def validate(self, attrs):
        if self.instance is not None:  # update: level only
            if 'skill_set' in attrs or 'skill_name' in attrs:
                raise serializers.ValidationError(
                    {'skill_set': ['Cannot change the skill; delete and re-add instead.']})
            return attrs

        name = (attrs.pop('skill_name', '') or '').strip()
        if not attrs.get('skill_set') and not name:
            raise serializers.ValidationError(
                {'skill_set': ['Provide skill_set or skill_name.']})
        if name and not attrs.get('skill_set'):
            existing = SkillSet.objects.filter(skill_name__iexact=name).first()
            attrs['skill_set'] = existing or SkillSet.objects.create(skill_name=name)

        # user_account is read-only, which silently disables DRF's
        # UniqueTogetherValidator — enforce it here so a duplicate attach is a
        # clean 400 instead of a DB IntegrityError 500.
        user = self.context['request'].user
        if SeekerSkillSet.objects.filter(
                user_account=user, skill_set=attrs['skill_set']).exists():
            raise serializers.ValidationError(
                {'skill_set': ['You already added this skill.']})
        return attrs
```

(A concurrent create can still race the `iexact` lookup; the unique constraint on `skill_name` makes the loser 500 in that hair's-width window — acceptable, noted.)

- [ ] **Step 4: Run — PASS; full suite; commit**

```bash
uv run python manage.py test
git add apps/seekers
git commit -m "feat(seekers): skill attach by name with get-or-create; duplicate attach is a clean 400; level-only updates"
```

---

### Task 5: Backend — change-password + password becomes create-only; backend PR

**Files:**
- Modify: `apps/accounts/views.py` (new view + strip update-hashing branches), `apps/accounts/serializers.py` (UserAccountSerializer), `apps/accounts/urls.py`, `jobApp/settings/base.py` (throttle scope entry if the login pattern needs one)
- Test: `apps/accounts/tests.py`

**Interfaces:**
- Produces (frontend Task 7): `POST /api/v1/accounts/change-password/` body `{current_password, new_password}` → 204; wrong current → 400 `{"current_password": ["Incorrect password."]}`; weak new → 400 `{"new_password": [...]}`. `PATCH /me/` (and `/users/{id}/`) with `password` → 400 `{"password": ["Use /accounts/change-password/ to change your password."]}`.

- [ ] **Step 1: Write the failing tests**

```python
class ChangePasswordTests(APITestCase):
    def setUp(self):
        self.user = UserAccount.objects.create_user(
            email='pw@example.com', password='Old-Password-123!', user_type='job_seeker')
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

    def _post(self, body):
        return self.client.post('/api/v1/accounts/change-password/', body, format='json')

    def test_happy_path_204_and_new_password_works(self):
        r = self._post({'current_password': 'Old-Password-123!', 'new_password': 'New-Password-456!'})
        self.assertEqual(r.status_code, 204)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('New-Password-456!'))

    def test_wrong_current_password_400(self):
        r = self._post({'current_password': 'nope', 'new_password': 'New-Password-456!'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('current_password', r.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Old-Password-123!'))

    def test_weak_new_password_400(self):
        r = self._post({'current_password': 'Old-Password-123!', 'new_password': '123'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('new_password', r.data)

    def test_anonymous_401(self):
        self.client.credentials()
        self.assertEqual(self._post({}).status_code, 401)

    def test_me_patch_password_now_rejected(self):
        r = self.client.patch('/api/v1/accounts/me/', {'password': 'Another-Pass-789!'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('password', r.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Old-Password-123!'))
```

- [ ] **Step 2: Run to verify failure** (`change-password/` 404s; me-PATCH password currently succeeds).

- [ ] **Step 3: Implement**

`apps/accounts/views.py` — new view (mirror the throttle-scope wiring the existing `login` view uses — read it first and copy that exact mechanism with scope `login`):

```python
@extend_schema(
    request=inline_serializer(name='ChangePasswordRequest', fields={
        'current_password': drf_serializers.CharField(),
        'new_password': drf_serializers.CharField(),
    }),
    responses={204: OpenApiResponse(description='Password changed'),
               400: OpenApiResponse(description='Validation error')},
    tags=['accounts'],
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Verify the current password, then set the new one."""
    current = request.data.get('current_password') or ''
    new = request.data.get('new_password') or ''
    if not request.user.check_password(current):
        return Response({'current_password': ['Incorrect password.']},
                        status=status.HTTP_400_BAD_REQUEST)
    try:
        validate_password(new, user=request.user)
    except DjangoValidationError as e:
        return Response({'new_password': list(e.messages)},
                        status=status.HTTP_400_BAD_REQUEST)
    request.user.password = make_password(new)
    request.user.save(update_fields=['password'])
    return Response(status=status.HTTP_204_NO_CONTENT)
```

`apps/accounts/serializers.py` — `UserAccountSerializer`: add to `validate` (or a `validate_password`-independent check in `validate`):

```python
    def validate(self, attrs):
        if self.instance is not None and 'password' in self.initial_data:
            raise serializers.ValidationError(
                {'password': ['Use /accounts/change-password/ to change your password.']})
        return attrs
```

and simplify `update()` to `return super().update(instance, validated_data)` (the hashing branch is now dead). In `views.py`, remove the now-dead password-hashing branches from the `me` PUT/PATCH handler and `UserAccountViewSet.perform_update`. JSON-only enforcement: if `apps/accounts` wraps auth endpoints with `parser_classes=[JSONParser]`, apply the same to `change_password` (follow the login view's decorators exactly).

`apps/accounts/urls.py` — add `path('change-password/', views.change_password, name='change-password'),` after `me/`.

- [ ] **Step 4: Commit, then FULL backend suite green**

```bash
git add apps/accounts jobApp
git commit -m "feat(accounts): verified change-password endpoint; password is create-only on account serializers"
uv run python manage.py test
```

(The full run re-exercises Tasks 2–4's tests together.)

- [ ] **Step 5: Push and open the backend PR (never merge)**

```bash
git push -u origin feat/seeker-applications
gh pr create --repo Dreyyy25/Job-Board-API-only --base staging --head feat/seeker-applications \
  --title "Seeker/applications API for frontend Slice 3" \
  --body "Nested job summaries on application reads + nested skill names; applications viewset lockdown (no create, immutable fields, role-based status transitions); seeker-skill attach by name with get-or-create and clean duplicate 400; verified change-password endpoint with password now create-only on account serializers. Requested by workframe-web Slice 3 (docs/superpowers/specs/2026-08-06-slice3-seeker-design.md)."
```

Report the PR URL; verify the `ci` check goes green (`gh pr checks --watch`).

---

### Task 6: Frontend — seeker/application view models move to `services/types.ts`

**Files:**
- Modify: `src/lib/services/types.ts`, `src/lib/mock/types.ts`, `src/lib/mock/services.ts`

**Interfaces:**
- Produces (Tasks 8–13): in `@/lib/services/types`: `AppStatus`, `DegreeType`, `Sex`, `Education`, `Experience`, `SeekerSkill`, `SeekerProfile`, `Application`, `ApplicationJob`, `ApplicationWithJob` — exact shapes below.

- [ ] **Step 1: Append to `src/lib/services/types.ts`**

```typescript
export type AppStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'
export type DegreeType =
  | 'High School'
  | 'Associate'
  | 'Bachelor'
  | 'Master'
  | 'PhD'
  | 'Certificate'
  | 'Diploma'
export type Sex = 'M' | 'F' | 'Other'

export interface Education {
  id: string
  school: string
  degree: DegreeType
  field: string
  /** YYYY-MM */
  start: string
  /** YYYY-MM, blank = ongoing */
  end: string
  percentage: number | null
}

export interface Experience {
  id: string
  company: string
  position: string
  city: string
  country: string
  /** YYYY-MM */
  start: string
  /** YYYY-MM, blank = current */
  end: string
  description: string
}

export interface SeekerSkill {
  id: string
  name: string
  level: SkillLevel
}

export interface SeekerProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  contact: string
  goals: string
  resumeUrl: string
  photo: string
  /** YYYY-MM-DD */
  dob: string
  sex: Sex
  education: Education[]
  experience: Experience[]
  skills: SeekerSkill[]
}

/** A job application submitted by the signed-in seeker. */
export interface Application {
  id: string
  jobId: string
  status: AppStatus
  /** YYYY-MM-DD */
  applied: string
  cover: string
}

/** The lean job summary embedded in an application — exactly what the
 * application screens render. The mock's full JobWithCompany satisfies it. */
export interface ApplicationJob {
  id: string
  title: string
  type: string
  city: string
  country: string
  salaryMin: number | null
  salaryMax: number | null
  salaryType: SalaryType | null
  companyId: string
  company: CompanyRef
  published: boolean
}

export interface ApplicationWithJob extends Application {
  job: ApplicationJob | null
}
```

- [ ] **Step 2: Re-point `src/lib/mock/types.ts`**

Delete its local `AppStatus`, `DegreeType`, `Sex`, `Education`, `Experience`, `SeekerSkill`, `SeekerProfile`, `Application` definitions and extend the existing re-export block:

```typescript
export type {
  Application,
  AppStatus,
  Company,
  CompanyStatus,
  DegreeType,
  Education,
  Experience,
  Job,
  JobSkill,
  SalaryType,
  SeekerProfile,
  SeekerSkill,
  Sex,
  SkillLevel,
} from '../services/types'
```

Remaining local types that reference the moved names (`Applicant` uses `AppStatus`, seeker types may use others) get explicit `import type { ... } from '../services/types'` additions — let `npm run typecheck` find every spot.

- [ ] **Step 3: Re-point `src/lib/mock/services.ts`**

Delete its local `ApplicationWithJob` interface; add `ApplicationWithJob` to the existing `import type`/`export type` lines from `../services/types`. (`ApplicantWithJob` stays local — company-console-only.)

- [ ] **Step 4: Verify + commit**

`npm run typecheck` clean; `npm run test` 97 green (mock data has no nulls; shapes are compatible).

```bash
git add src/lib/services/types.ts src/lib/mock/types.ts src/lib/mock/services.ts
git commit -m "refactor(types): move seeker and application view models to services/types"
```

---

### Task 7: Frontend — API DTOs, api modules, MSW fixtures/handlers

**Files:**
- Modify: `src/lib/api/types.ts`, `src/lib/api/auth.ts`, `src/test/msw/fixtures.ts`, `src/test/msw/handlers.ts`
- Create: `src/lib/api/seekers.ts`, `src/lib/api/applications.ts`
- Test: `src/test/msw/__tests__/slice3-harness.test.ts`

**Interfaces:**
- Produces (Tasks 8–13 import these exact names):
  - `api/types.ts`: `EducationDto`, `ExperienceDto`, `SeekerSkillReadDto`, `SeekerDashboard {profile: SeekerProfile; education: EducationDto[]; experience: ExperienceDto[]; skills: SeekerSkillReadDto[]}`, `ApplicationJobPostDto`, `ApplicationReadDto`, `ApplyResponse {message: string; data: {id: string; application_status: string; application_date: string}}` (note: the existing DTO `SeekerProfile` in api/types is reused — it is distinct from the view model of the same name in services/types)
  - `api/seekers.ts`: `getSeekerDashboard(userId)`, `patchSeekerProfile(userId, body)`, `createEducation(body)`, `deleteEducation(id)`, `createExperience(body)`, `deleteExperience(id)`, `createSeekerSkill(body: {skill_name: string; skill_level: string})`, `deleteSeekerSkill(id)`
  - `api/applications.ts`: `getApplications()` (page_size=100), `getApplicationById(id)`, `postApply(body: {user_account: string; job_post: string; cover_letter: string})`, `patchApplicationStatus(id, status)`
  - `api/auth.ts`: `changePassword(currentPassword: string, newPassword: string): Promise<void>`
  - Fixtures: `educationDto()`, `experienceDto()`, `seekerSkillDto()`, `seekerDashboard()`, `applicationDto()`, `EDUCATION_ID`, `EXPERIENCE_ID`, `SEEKER_SKILL_ID`, `APPLICATION_ID` (+ reuse `JOB_POST_ID`, `PUBLIC_COMPANY_ID`, `SEEKER_ID`)
  - Handlers (all behind `denyUnlessAuthed`): GET `*/api/v1/seekers/dashboard/:id/`, PATCH `*/api/v1/seekers/profiles/:id/`, POST/DELETE education + experience + seeker-skills, PATCH `*/api/v1/accounts/me/`, POST `*/api/v1/accounts/change-password/` (204), GET/PATCH `*/api/v1/jobs/job-applications/` (+`/:id/`), POST `*/api/v1/jobs/apply/`

- [ ] **Step 1: DTO types** — append to `src/lib/api/types.ts`:

```typescript
export interface EducationDto {
  id: string
  user_account: string
  institute_university_name: string
  degree_type: string
  field_of_study: string
  academic_details: string
  /** decimal string or null */
  percentage: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface ExperienceDto {
  id: string
  user_account: string
  company_name: string
  position: string
  description: string
  job_location_city: string
  job_location_country: string
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export interface SeekerSkillReadDto {
  id: string
  user_account: string
  skill_set: { id: string; skill_name: string; created_at: string }
  skill_level: SkillLevel
}

/** GET /seekers/dashboard/{userId}/ */
export interface SeekerDashboard {
  profile: SeekerProfile
  education: EducationDto[]
  experience: ExperienceDto[]
  skills: SeekerSkillReadDto[]
}

export interface ApplicationJobPostDto {
  id: string
  job_title: string
  company: { id: string; company_name: string }
  job_type: { id: string; job_type_name: string }
  job_location: { city: string; country: string }
  salary_min: string | null
  salary_max: string | null
  salary_type: SalaryType | ''
  deadline_date: string | null
  is_published: boolean
  is_active: boolean
}

export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn'

export interface ApplicationReadDto {
  id: string
  user_account: string
  job_post: ApplicationJobPostDto
  application_date: string
  application_status: ApplicationStatus
  cover_letter: string
  updated_at: string
}

export interface ApplyResponse {
  message: string
  data: { id: string; application_status: ApplicationStatus; application_date: string }
}
```

- [ ] **Step 2: `src/lib/api/seekers.ts`**

```typescript
import { apiDelete, apiGet, apiPatch, apiPost } from './client'
import type { EducationDto, ExperienceDto, SeekerDashboard, SeekerProfile, SeekerSkillReadDto } from './types'

export function getSeekerDashboard(userId: string) {
  return apiGet<SeekerDashboard>(`/seekers/dashboard/${userId}/`)
}

export function patchSeekerProfile(userId: string, body: Partial<SeekerProfile>) {
  return apiPatch<SeekerProfile>(`/seekers/profiles/${userId}/`, body)
}

export function createEducation(body: Partial<EducationDto>) {
  return apiPost<EducationDto>('/seekers/education/', body)
}

export function deleteEducation(id: string) {
  return apiDelete<void>(`/seekers/education/${id}/`)
}

export function createExperience(body: Partial<ExperienceDto>) {
  return apiPost<ExperienceDto>('/seekers/experience/', body)
}

export function deleteExperience(id: string) {
  return apiDelete<void>(`/seekers/experience/${id}/`)
}

export function createSeekerSkill(body: { skill_name: string; skill_level: string }) {
  return apiPost<{ id: string; skill_set: string; skill_level: string }>('/seekers/seeker-skills/', body)
}

export function deleteSeekerSkill(id: string) {
  return apiDelete<void>(`/seekers/seeker-skills/${id}/`)
}
```

- [ ] **Step 3: `src/lib/api/applications.ts`**

```typescript
import { apiGet, apiPatch, apiPost } from './client'
import type { ApplicationReadDto, ApplicationStatus, ApplyResponse, Paginated } from './types'

export function getApplications() {
  return apiGet<Paginated<ApplicationReadDto>>('/jobs/job-applications/', { page_size: 100 })
}

export function getApplicationById(id: string) {
  return apiGet<ApplicationReadDto>(`/jobs/job-applications/${id}/`)
}

export function postApply(body: { user_account: string; job_post: string; cover_letter: string }) {
  return apiPost<ApplyResponse>('/jobs/apply/', body)
}

export function patchApplicationStatus(id: string, status: ApplicationStatus) {
  return apiPatch<{ id: string; application_status: ApplicationStatus }>(
    `/jobs/job-applications/${id}/`,
    { application_status: status },
  )
}
```

`src/lib/api/auth.ts` — add:

```typescript
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiPost<void>('/accounts/change-password/', {
    current_password: currentPassword,
    new_password: newPassword,
  })
}
```

- [ ] **Step 4: Fixtures** — append to `src/test/msw/fixtures.ts` (import the new DTO types):

```typescript
export const EDUCATION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
export const EXPERIENCE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
export const SEEKER_SKILL_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
export const APPLICATION_ID = '12121212-1212-4121-8121-121212121212'

export function educationDto(overrides: Partial<EducationDto> = {}): EducationDto {
  return {
    id: EDUCATION_ID, user_account: SEEKER_ID,
    institute_university_name: 'TU Berlin', degree_type: 'Master',
    field_of_study: 'Computer Science', academic_details: '',
    percentage: '85.00', start_date: '2019-09-01', end_date: '2021-07-01',
    created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function experienceDto(overrides: Partial<ExperienceDto> = {}): ExperienceDto {
  return {
    id: EXPERIENCE_ID, user_account: SEEKER_ID,
    company_name: 'Vertex Data', position: 'ML Engineer',
    description: 'Built pipelines.', job_location_city: 'Berlin',
    job_location_country: 'Germany', start_date: '2021-08-01', end_date: null,
    created_at: '2026-08-01T10:00:00Z', updated_at: '2026-08-01T10:00:00Z',
    ...overrides,
  }
}

export function seekerSkillDto(overrides: Partial<SeekerSkillReadDto> = {}): SeekerSkillReadDto {
  return {
    id: SEEKER_SKILL_ID, user_account: SEEKER_ID,
    skill_set: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', skill_name: 'Python', created_at: '2026-08-01T10:00:00Z' },
    skill_level: 'Advanced',
    ...overrides,
  }
}

export function seekerDashboard(overrides: Partial<SeekerDashboard> = {}): SeekerDashboard {
  return {
    profile: seekerProfile({ first_name: 'Ava', last_name: 'Reyes', goals: 'Ship ML systems.', contact_details: '+49 111', resume_url: 'https://cv.example/ava.pdf' }),
    education: [educationDto()],
    experience: [experienceDto()],
    skills: [seekerSkillDto()],
    ...overrides,
  }
}

export function applicationDto(overrides: Partial<ApplicationReadDto> = {}): ApplicationReadDto {
  return {
    id: APPLICATION_ID, user_account: SEEKER_ID,
    job_post: {
      id: JOB_POST_ID, job_title: 'Machine Learning Engineer',
      company: { id: PUBLIC_COMPANY_ID, company_name: 'Halcyon Systems' },
      job_type: { id: JOB_TYPE_FULLTIME_ID, job_type_name: 'Full-time' },
      job_location: { city: 'Berlin', country: 'Germany' },
      salary_min: '90000.00', salary_max: '120000.00', salary_type: 'yearly',
      deadline_date: '2026-09-01', is_published: true, is_active: true,
    },
    application_date: '2026-08-05T09:30:00Z', application_status: 'pending',
    cover_letter: 'I love this role.', updated_at: '2026-08-05T09:30:00Z',
    ...overrides,
  }
}
```

- [ ] **Step 5: Handlers** — append inside the `handlers` array in `src/test/msw/handlers.ts` (every one gated):

```typescript
  http.get('*/api/v1/seekers/dashboard/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(seekerDashboard()),
  ),
  http.patch('*/api/v1/seekers/profiles/:id/', async ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json(seekerProfile({ ...(await request.json()) as object })),
  ),
  http.patch('*/api/v1/accounts/me/', async ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json({ ...seekerAccount(), ...(await request.json()) as object }),
  ),
  http.post('*/api/v1/accounts/change-password/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 }),
  ),
  http.post('*/api/v1/seekers/education/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(educationDto(), { status: 201 }),
  ),
  http.delete('*/api/v1/seekers/education/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 }),
  ),
  http.post('*/api/v1/seekers/experience/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(experienceDto(), { status: 201 }),
  ),
  http.delete('*/api/v1/seekers/experience/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 }),
  ),
  http.post('*/api/v1/seekers/seeker-skills/', ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json({ id: SEEKER_SKILL_ID, skill_set: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', skill_level: 'Advanced' }, { status: 201 }),
  ),
  http.delete('*/api/v1/seekers/seeker-skills/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 }),
  ),
  http.get('*/api/v1/jobs/job-applications/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(paginated([applicationDto()])),
  ),
  http.get('*/api/v1/jobs/job-applications/:id/', ({ request, params }) =>
    denyUnlessAuthed(request) ??
    (params.id === APPLICATION_ID
      ? HttpResponse.json(applicationDto())
      : HttpResponse.json({ detail: 'No JobPostActivity matches the given query.' }, { status: 404 })),
  ),
  http.patch('*/api/v1/jobs/job-applications/:id/', ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json({ id: APPLICATION_ID, application_status: 'withdrawn' }),
  ),
  http.post('*/api/v1/jobs/apply/', ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json(
      { message: 'Application submitted successfully',
        data: { id: APPLICATION_ID, application_status: 'pending', application_date: '2026-08-06T10:00:00Z' } },
      { status: 201 },
    ),
  ),
```

- [ ] **Step 6: Harness smoke test** — `src/test/msw/__tests__/slice3-harness.test.ts`

```typescript
/** New Slice-3 endpoints respond with staging-shaped bodies and are auth-gated. */
import { beforeEach, describe, expect, it } from 'vitest'
import { setAccessToken, clearAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, APPLICATION_ID, SEEKER_ID } from '../fixtures'
import { getApplications } from '@/lib/api/applications'
import { getSeekerDashboard } from '@/lib/api/seekers'

describe('slice-3 MSW harness', () => {
  beforeEach(() => setAccessToken(ACCESS_TOKEN))

  it('serves the dashboard composite', async () => {
    const d = await getSeekerDashboard(SEEKER_ID)
    expect(d.profile.first_name).toBe('Ava')
    expect(d.skills[0].skill_set.skill_name).toBe('Python')
  })

  it('serves nested applications and rejects tokenless calls', async () => {
    const page = await getApplications()
    expect(page.results[0].id).toBe(APPLICATION_ID)
    expect(page.results[0].job_post.company.company_name).toBe('Halcyon Systems')
    clearAccessToken()
    await expect(getApplications()).rejects.toMatchObject({ status: 401 })
  })
})
```

- [ ] **Step 7: Run + commit**

`npx vitest run src/test`, `npm run typecheck`, `npm run test` (all green).

```bash
git add src/lib/api src/test/msw
git commit -m "feat(api): seeker and application DTOs, typed endpoints, change-password, MSW coverage"
```

---

### Task 8: Frontend — `services/seeker.ts`

**Files:**
- Create: `src/lib/services/seeker.ts`
- Test: `src/lib/services/__tests__/seeker.test.ts`

**Interfaces:**
- Consumes: Task 7's api modules; `getMe` from `@/lib/api/auth`; types from `./types`.
- Produces (Tasks 12 + barrel): `getSeekerProfile(): Promise<SeekerProfile>`; `updateSeekerProfile(patch: Partial<SeekerProfile>): Promise<Partial<SeekerProfile>>`; `addEducation(input: Omit<Education, 'id'>): Promise<Education>`; `deleteEducation(id)`; `addExperience(input: Omit<Experience, 'id'>): Promise<Experience>`; `deleteExperience(id)`; `addSkill(input: {name: string; level: SkillLevel}): Promise<SeekerSkill>`; `deleteSkill(id)` — mock-compatible signatures.

- [ ] **Step 1: Write the failing tests**

```typescript
/** Seeker services: composite profile, field fan-out, month/date adapters. */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, SEEKER_ID, educationDto, seekerDashboard } from '@/test/msw/fixtures'
import {
  addEducation, addSkill, getSeekerProfile, updateSeekerProfile,
} from '../seeker'

beforeEach(() => setAccessToken(ACCESS_TOKEN))

describe('getSeekerProfile', () => {
  it('composes dashboard + account into the screen shape', async () => {
    const p = await getSeekerProfile()
    expect(p).toMatchObject({
      id: SEEKER_ID, firstName: 'Ava', lastName: 'Reyes',
      email: 'ava@example.com', contact: '+49 111',
      goals: 'Ship ML systems.', resumeUrl: 'https://cv.example/ava.pdf',
      dob: '', sex: 'Other', photo: '',
    })
    expect(p.education[0]).toEqual({
      id: educationDto().id, school: 'TU Berlin', degree: 'Master',
      field: 'Computer Science', start: '2019-09', end: '2021-07', percentage: 85,
    })
    expect(p.experience[0]).toMatchObject({ company: 'Vertex Data', start: '2021-08', end: '' })
    expect(p.skills[0]).toMatchObject({ name: 'Python', level: 'Advanced' })
  })
})

describe('updateSeekerProfile', () => {
  it('fans profile fields to the seeker PATCH and account fields to /me/', async () => {
    const hits: { url: string; body: unknown }[] = []
    server.use(
      http.patch('*/api/v1/seekers/profiles/:id/', async ({ request }) => {
        hits.push({ url: request.url, body: await request.json() })
        return HttpResponse.json({})
      }),
      http.patch('*/api/v1/accounts/me/', async ({ request }) => {
        hits.push({ url: request.url, body: await request.json() })
        return HttpResponse.json({})
      }),
    )
    await updateSeekerProfile({ firstName: 'Maya', dob: '1999-01-31', sex: 'F', photo: 'https://p/x.png' })
    expect(hits).toHaveLength(2)
    const seekerHit = hits.find((h) => h.url.includes('/seekers/'))!
    const meHit = hits.find((h) => h.url.includes('/accounts/me/'))!
    expect(seekerHit.body).toEqual({ first_name: 'Maya' })
    expect(meHit.body).toEqual({ date_of_birth: '1999-01-31', sex: 'F', user_image_url: 'https://p/x.png' })
  })

  it('sends only the seeker PATCH when no account fields are present', async () => {
    const urls: string[] = []
    server.use(
      http.patch('*/api/v1/seekers/profiles/:id/', ({ request }) => {
        urls.push(request.url)
        return HttpResponse.json({})
      }),
    )
    await updateSeekerProfile({ goals: 'New goals', resumeUrl: '', contact: '+1' })
    expect(urls).toHaveLength(1)
  })
})

describe('education + skills adapters', () => {
  it('maps months to first-of-month dates and blank end to null', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.post('*/api/v1/seekers/education/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(educationDto(), { status: 201 })
      }),
    )
    await addEducation({ school: 'TU Berlin', degree: 'Master', field: 'CS', start: '2019-09', end: '', percentage: null })
    expect(body).toMatchObject({
      institute_university_name: 'TU Berlin', degree_type: 'Master',
      field_of_study: 'CS', start_date: '2019-09-01', end_date: null, percentage: null,
    })
  })

  it('addSkill posts skill_name and returns the input name', async () => {
    const s = await addSkill({ name: 'Terraform', level: 'Advanced' })
    expect(s).toMatchObject({ name: 'Terraform', level: 'Advanced' })
    expect(s.id).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run — FAIL (module missing).**

- [ ] **Step 3: Implement `src/lib/services/seeker.ts`**

```typescript
/**
 * Real seeker services. The screen's SeekerProfile is a composite: name/goals/
 * contact/resume + education/experience/skills come from the seekers app
 * (dashboard endpoint), while email/dob/sex/photo live on the account
 * (/accounts/me/). updateSeekerProfile fans a flat patch back out to the
 * right endpoint(s).
 */
import { getMe } from '@/lib/api/auth'
import {
  createEducation, createExperience, createSeekerSkill,
  deleteEducation as apiDeleteEducation, deleteExperience as apiDeleteExperience,
  deleteSeekerSkill, getSeekerDashboard, patchSeekerProfile,
} from '@/lib/api/seekers'
import { apiPatch } from '@/lib/api/client'
import type { EducationDto, ExperienceDto, SeekerSkillReadDto, UserAccount } from '@/lib/api/types'
import type { DegreeType, Education, Experience, SeekerProfile, SeekerSkill, Sex, SkillLevel } from './types'

const toApiDate = (month: string): string | null => (month ? `${month}-01` : null)
const toMonth = (date: string | null): string => (date ? date.slice(0, 7) : '')
const toSex = (v: string): Sex => (v === 'M' || v === 'F' ? v : 'Other')

function adaptEducation(dto: EducationDto): Education {
  return {
    id: dto.id,
    school: dto.institute_university_name,
    degree: dto.degree_type as DegreeType,
    field: dto.field_of_study,
    start: toMonth(dto.start_date),
    end: toMonth(dto.end_date),
    percentage: dto.percentage == null ? null : Number(dto.percentage),
  }
}

function adaptExperience(dto: ExperienceDto): Experience {
  return {
    id: dto.id,
    company: dto.company_name,
    position: dto.position,
    city: dto.job_location_city,
    country: dto.job_location_country,
    start: toMonth(dto.start_date),
    end: toMonth(dto.end_date),
    description: dto.description,
  }
}

const adaptSkill = (dto: SeekerSkillReadDto): SeekerSkill => ({
  id: dto.id,
  name: dto.skill_set.skill_name,
  level: dto.skill_level,
})

export async function getSeekerProfile(): Promise<SeekerProfile> {
  const me = await getMe()
  const dash = await getSeekerDashboard(me.id)
  return {
    id: me.id,
    firstName: dash.profile.first_name,
    lastName: dash.profile.last_name,
    email: me.email,
    contact: dash.profile.contact_details,
    goals: dash.profile.goals,
    resumeUrl: dash.profile.resume_url,
    photo: me.user_image_url,
    dob: me.date_of_birth ?? '',
    sex: toSex(me.sex),
    education: dash.education.map(adaptEducation),
    experience: dash.experience.map(adaptExperience),
    skills: dash.skills.map(adaptSkill),
  }
}

const PROFILE_KEYS = ['firstName', 'lastName', 'contact', 'goals', 'resumeUrl'] as const
const ACCOUNT_KEYS = ['dob', 'sex', 'photo'] as const

export async function updateSeekerProfile(
  patch: Partial<SeekerProfile>,
): Promise<Partial<SeekerProfile>> {
  const profileBody: Record<string, unknown> = {}
  if (patch.firstName !== undefined) profileBody.first_name = patch.firstName
  if (patch.lastName !== undefined) profileBody.last_name = patch.lastName
  if (patch.contact !== undefined) profileBody.contact_details = patch.contact
  if (patch.goals !== undefined) profileBody.goals = patch.goals
  if (patch.resumeUrl !== undefined) profileBody.resume_url = patch.resumeUrl

  const accountBody: Record<string, unknown> = {}
  if (patch.dob !== undefined) accountBody.date_of_birth = patch.dob || null
  if (patch.sex !== undefined) accountBody.sex = patch.sex
  if (patch.photo !== undefined) accountBody.user_image_url = patch.photo

  const calls: Promise<unknown>[] = []
  if (Object.keys(profileBody).length > 0) {
    const me = await getMe()
    calls.push(patchSeekerProfile(me.id, profileBody))
  }
  if (Object.keys(accountBody).length > 0) {
    calls.push(apiPatch<UserAccount>('/accounts/me/', accountBody))
  }
  await Promise.all(calls)
  return patch
}

export async function addEducation(input: Omit<Education, 'id'>): Promise<Education> {
  const dto = await createEducation({
    institute_university_name: input.school,
    degree_type: input.degree,
    field_of_study: input.field,
    start_date: toApiDate(input.start),
    end_date: toApiDate(input.end),
    percentage: input.percentage == null ? null : String(input.percentage),
  })
  return adaptEducation(dto)
}

export const deleteEducation = (id: string): Promise<void> => apiDeleteEducation(id)

export async function addExperience(input: Omit<Experience, 'id'>): Promise<Experience> {
  const dto = await createExperience({
    company_name: input.company,
    position: input.position,
    description: input.description,
    job_location_city: input.city,
    job_location_country: input.country,
    start_date: toApiDate(input.start),
    end_date: toApiDate(input.end),
  })
  return adaptExperience(dto)
}

export const deleteExperience = (id: string): Promise<void> => apiDeleteExperience(id)

export async function addSkill(input: { name: string; level: SkillLevel }): Promise<SeekerSkill> {
  // The create response carries the bare skill_set UUID, not the name — the
  // caller already knows the name it submitted.
  const dto = await createSeekerSkill({ skill_name: input.name, skill_level: input.level })
  return { id: dto.id, name: input.name, level: input.level }
}

export const deleteSkill = (id: string): Promise<void> => deleteSeekerSkill(id)
```

(`ArrayEducationDto.percentage` is typed `string | null` in the DTO but sent as `string | null` on create — matches DRF's decimal handling both ways.)

- [ ] **Step 4: Run — PASS; typecheck; commit**

```bash
git add src/lib/services/seeker.ts src/lib/services/__tests__/seeker.test.ts
git commit -m "feat(services): real seeker profile composite with field fan-out and month adapters"
```

---

### Task 9: Frontend — `services/applications.ts` + barrel

**Files:**
- Create: `src/lib/services/applications.ts`
- Modify: `src/lib/services/index.ts`
- Test: `src/lib/services/__tests__/applications.test.ts`

**Interfaces:**
- Produces (Tasks 11–13): `listApplications(): Promise<ApplicationWithJob[]>`; `getApplication(id): Promise<ApplicationWithJob | null>`; `applyToJob(jobId, cover): Promise<Application>`; `withdrawApplication(id): Promise<void>`. Barrel additionally re-exports Task 8's functions and the new types, plus `changePassword` from `@/lib/api/auth`.

- [ ] **Step 1: Write the failing tests**

```typescript
/** Applications services: nested adapter, apply contract, withdraw PATCH. */
import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, APPLICATION_ID, JOB_POST_ID, PUBLIC_COMPANY_ID, SEEKER_ID, applicationDto, paginated } from '@/test/msw/fixtures'
import { applyToJob, getApplication, listApplications, withdrawApplication } from '../applications'

beforeEach(() => setAccessToken(ACCESS_TOKEN))

describe('listApplications', () => {
  it('adapts the nested read shape', async () => {
    const [a] = await listApplications()
    expect(a).toMatchObject({
      id: APPLICATION_ID, jobId: JOB_POST_ID, status: 'pending',
      applied: '2026-08-05', cover: 'I love this role.',
    })
    expect(a.job).toEqual({
      id: JOB_POST_ID, title: 'Machine Learning Engineer', type: 'Full-time',
      city: 'Berlin', country: 'Germany', salaryMin: 90000, salaryMax: 120000,
      salaryType: 'yearly', companyId: PUBLIC_COMPANY_ID,
      company: { id: PUBLIC_COMPANY_ID, name: 'Halcyon Systems' }, published: true,
    })
  })
})

describe('getApplication', () => {
  it('returns null on 404', async () => {
    expect(await getApplication('00000000-0000-4000-8000-000000000000')).toBeNull()
  })
})

describe('applyToJob', () => {
  it('posts the apply contract with the session user id', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.post('*/api/v1/jobs/apply/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { message: 'ok', data: { id: APPLICATION_ID, application_status: 'pending', application_date: '2026-08-06T10:00:00Z' } },
          { status: 201 },
        )
      }),
    )
    const app = await applyToJob(JOB_POST_ID, 'Hi!')
    expect(body).toEqual({ user_account: SEEKER_ID, job_post: JOB_POST_ID, cover_letter: 'Hi!' })
    expect(app).toMatchObject({ id: APPLICATION_ID, jobId: JOB_POST_ID, status: 'pending', applied: '2026-08-06', cover: 'Hi!' })
  })

  it('surfaces the API error message', async () => {
    server.use(
      http.post('*/api/v1/jobs/apply/', () =>
        HttpResponse.json({ error: 'You have already applied for this job' }, { status: 400 }),
      ),
    )
    await expect(applyToJob(JOB_POST_ID, 'Hi!')).rejects.toMatchObject({
      message: 'You have already applied for this job',
    })
  })
})

describe('withdrawApplication', () => {
  it('PATCHes application_status to withdrawn', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.patch('*/api/v1/jobs/job-applications/:id/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ id: APPLICATION_ID, application_status: 'withdrawn' })
      }),
    )
    await withdrawApplication(APPLICATION_ID)
    expect(body).toEqual({ application_status: 'withdrawn' })
  })
})
```

- [ ] **Step 2: Run — FAIL.**

- [ ] **Step 3: Implement `src/lib/services/applications.ts`**

```typescript
/** Real application services for the signed-in seeker. */
import { ApiError } from '@/lib/api/client'
import { getMe } from '@/lib/api/auth'
import {
  getApplicationById, getApplications, patchApplicationStatus, postApply,
} from '@/lib/api/applications'
import type { ApplicationJobPostDto, ApplicationReadDto } from '@/lib/api/types'
import type { Application, ApplicationJob, ApplicationWithJob } from './types'

const num = (v: string | null): number | null => (v == null ? null : Number(v))

function adaptJobSummary(dto: ApplicationJobPostDto): ApplicationJob {
  return {
    id: dto.id,
    title: dto.job_title,
    type: dto.job_type.job_type_name,
    city: dto.job_location.city,
    country: dto.job_location.country,
    salaryMin: num(dto.salary_min),
    salaryMax: num(dto.salary_max),
    salaryType: dto.salary_type || null,
    companyId: dto.company.id,
    company: { id: dto.company.id, name: dto.company.company_name },
    published: dto.is_published,
  }
}

function adaptApplication(dto: ApplicationReadDto): ApplicationWithJob {
  return {
    id: dto.id,
    jobId: dto.job_post.id,
    status: dto.application_status,
    applied: dto.application_date.slice(0, 10),
    cover: dto.cover_letter,
    job: adaptJobSummary(dto.job_post),
  }
}

export async function listApplications(): Promise<ApplicationWithJob[]> {
  const page = await getApplications()
  return page.results.map(adaptApplication)
}

export async function getApplication(id: string): Promise<ApplicationWithJob | null> {
  try {
    return adaptApplication(await getApplicationById(id))
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null
    throw err
  }
}

export async function applyToJob(jobId: string, cover: string): Promise<Application> {
  const me = await getMe()
  const res = await postApply({ user_account: me.id, job_post: jobId, cover_letter: cover })
  return {
    id: res.data.id,
    jobId,
    status: res.data.application_status,
    applied: res.data.application_date.slice(0, 10),
    cover,
  }
}

export async function withdrawApplication(id: string): Promise<void> {
  await patchApplicationStatus(id, 'withdrawn')
}
```

- [ ] **Step 4: Extend the barrel** — `src/lib/services/index.ts` adds:

```typescript
export type {
  Application,
  ApplicationJob,
  ApplicationWithJob,
  AppStatus,
  DegreeType,
  Education,
  Experience,
  SeekerProfile,
  SeekerSkill,
  Sex,
} from './types'
export {
  addEducation, addExperience, addSkill,
  deleteEducation, deleteExperience, deleteSkill,
  getSeekerProfile, updateSeekerProfile,
} from './seeker'
export {
  applyToJob, getApplication, listApplications, withdrawApplication,
} from './applications'
export { changePassword } from '@/lib/api/auth'
```

- [ ] **Step 5: Run — PASS; typecheck; commit**

```bash
git add src/lib/services
git commit -m "feat(services): real applications — nested adapter, apply, withdraw"
```

---

### Task 10: Frontend — auth-context `refreshUser()` + session-hint

**Files:**
- Modify: `src/lib/api/client.ts` (flag in setAccessToken/clearAccessToken), `src/lib/auth/auth-context.tsx`
- Test: `src/lib/auth/__tests__/auth-context.test.tsx` (updates + new cases)

**Interfaces:**
- Produces: `useAuth()` additionally exposes `refreshUser(): Promise<void>`. `localStorage['wf-session']` = `'1'` while a session exists; bootstrap skips the refresh probe when absent.

- [ ] **Step 1: Write the failing tests** (append to the existing suite; follow its harness helpers):

```typescript
  it('skips the bootstrap refresh entirely for a first-time guest', async () => {
    // no wf-session flag in localStorage
    let refreshHits = 0
    server.use(
      http.post('*/api/v1/accounts/token/refresh/', () => {
        refreshHits += 1
        return HttpResponse.json({ detail: 'no cookie' }, { status: 401 })
      }),
    )
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(refreshHits).toBe(0)
  })

  it('sets the session hint on login and clears it on logout', async () => {
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(() => result.current.login('ava@example.com', 'pw'))
    expect(localStorage.getItem('wf-session')).toBe('1')
    await act(() => result.current.logout())
    expect(localStorage.getItem('wf-session')).toBeNull()
  })

  it('refreshUser rebuilds the session user from /me/', async () => {
    localStorage.setItem('wf-session', '1')
    const { result } = renderAuth()
    await waitFor(() => expect(result.current.user).not.toBeNull())
    server.use(
      http.get('*/api/v1/seekers/profiles/:id/', () =>
        HttpResponse.json(seekerProfile({ first_name: 'Maya', last_name: 'Lintang' })),
      ),
    )
    await act(() => result.current.refreshUser())
    expect(result.current.user?.name).toBe('Maya Lintang')
  })
```

(Adapt helper names — `renderAuth`, auth'd handler overrides — to what the existing file actually uses; the suite already has equivalents. **Existing bootstrap tests assume the probe always fires: add `localStorage.setItem('wf-session', '1')` to the suite's shared `beforeEach`,** with the guest test explicitly removing it, and add `localStorage.clear()` to `afterEach`.)

- [ ] **Step 2: Run — new tests FAIL** (probe fires for guests; no flag; no refreshUser).

- [ ] **Step 3: Implement**

`src/lib/api/client.ts` — inside the existing `setAccessToken` add `localStorage.setItem('wf-session', '1')`; inside `clearAccessToken` add `localStorage.removeItem('wf-session')`. Export `const SESSION_HINT_KEY = 'wf-session'` for tests/context.

`src/lib/auth/auth-context.tsx` — bootstrap block becomes:

```typescript
    if (!bootstrapped.current) {
      bootstrapped.current = true
      // A first-time guest has no session hint: skip the refresh probe
      // entirely (no doomed network call, no console 401). The httpOnly
      // cookie stays the source of truth — the hint only gates the attempt.
      if (!localStorage.getItem(SESSION_HINT_KEY)) {
        setIsLoading(false)
      } else {
        void (async () => {
          /* existing bootstrap body unchanged */
        })()
      }
    }
```

Add:

```typescript
  const refreshUser = useCallback(async () => {
    const gen = sessionGen.current
    const me = await authApi.getMe()
    const sessionUser = await buildSessionUser({ id: me.id, email: me.email, user_type: me.user_type })
    if (gen === sessionGen.current) setUser(sessionUser)
  }, [])
```

and expose `refreshUser` through the context value + its TypeScript type.

- [ ] **Step 4: Run the auth suite + full suite — PASS; commit**

`npx vitest run src/lib/auth`, `npm run test`, `npm run typecheck`.

```bash
git add src/lib/api/client.ts src/lib/auth
git commit -m "feat(auth): session-hint gated bootstrap and refreshUser for profile-name changes"
```

---

### Task 11: Frontend — dashboard, applications, application-detail pages

**Files:**
- Modify: `src/pages/seeker/dashboard.tsx`, `src/pages/seeker/applications.tsx`, `src/pages/seeker/application-detail.tsx`
- Test: `src/pages/seeker/__tests__/dashboard.test.tsx`, `applications.test.tsx`, `application-detail.test.tsx`

Page deltas (surgical; everything else unchanged):
- `dashboard.tsx`: `import { listApplications, listJobs } from '@/lib/services'` (drops the mock import — `listJobs` is the Slice-2 real one).
- `applications.tsx`: `import { listApplications, withdrawApplication } from '@/lib/services'`; `import type { AppStatus } from '@/lib/services'`; withdraw mutation gains `onError: (err) => toast(err instanceof Error ? err.message : 'Could not withdraw')`.
- `application-detail.tsx`: `import { getApplication } from '@/lib/services'`; `import type { AppStatus } from '@/lib/services'`.

- [ ] **Step 1: Write the failing page tests** (harness identical to the Slice-2 page tests — `MemoryRouter` + `QueryClient {retry: false}`; `setAccessToken(ACCESS_TOKEN)` in `beforeEach` since the services hit auth-gated handlers; mock `useAuth` where the page reads it):

`dashboard.test.tsx` — mock auth as a seeker (`vi.mock('@/lib/auth/auth-context')`, user name "Ava Reyes"); assert: greeting "Welcome back, Ava"; stat "Total applications" value 1; recent row shows "Machine Learning Engineer" + "Halcyon Systems"; recommended section renders the `jobPost()` fixture card (job-posts handler is public).

`applications.test.tsx` — assert: row with job title, company, "Aug 5, 2026", pending badge; clicking Withdraw fires PATCH (capture via `server.use`) and shows the "Application withdrawn" toast; a 400 override shows the error toast instead.

`application-detail.test.tsx` — route `/seeker/applications/:id`; assert: title, company name, salary "$90k–$120k /yr", cover letter text, status timeline present; unknown id → "Application not found".

Write the three files with the concrete assertions above (follow `src/pages/public/__tests__/jobs.test.tsx` for structure and the toast assertion pattern used in existing suites).

- [ ] **Step 2: Run — FAIL (pages still on mock, mock store shapes differ).**

- [ ] **Step 3: Apply the page deltas; run — PASS; full suite; commit**

```bash
git add src/pages/seeker src/pages/seeker/__tests__
git commit -m "feat(seeker): dashboard and applications screens on real API"
```

---

### Task 12: Frontend — profile + settings pages

**Files:**
- Modify: `src/pages/seeker/profile.tsx`, `src/pages/settings.tsx`
- Test: `src/pages/seeker/__tests__/profile.test.tsx`, `src/pages/__tests__/settings.test.tsx`

Deltas:
- `profile.tsx`: services imports (`getSeekerProfile, updateSeekerProfile, addEducation, deleteEducation, addExperience, deleteExperience, addSkill, deleteSkill` from `@/lib/services`; types from `@/lib/services`; `ENUMS` stays on `@/lib/mock/data`). `OverviewTab`'s save mutation gains `onSuccess: () => { refresh(); toast('Profile updated'); void refreshUser() }` (get `refreshUser` from `useAuth()`) and `onError` toast; every add/delete mutation in the three tabs gains `onError: (err) => toast(err instanceof Error ? err.message : 'Something went wrong')` — the duplicate-skill 400 message surfaces verbatim.
- `settings.tsx`: services imports; email field becomes read-only display (`<Input id="s-email" value={account.email} readOnly disabled />` and drop `email` from the `saveAccount` patch body); password section replaces the local-only handler with a real mutation:

```typescript
  const changePw = useMutation({
    mutationFn: () => changePassword(pw.current, pw.next),
    onSuccess: () => {
      setPw({ current: '', next: '', confirm: '' })
      setPwError('')
      toast('Password changed')
    },
    onError: (err) => setPwError(err instanceof Error ? err.message : 'Could not change password'),
  })

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) return setPwError('Passwords don’t match.')
    setPwError('')
    changePw.mutate()
  }
```

(`changePassword` from `@/lib/services`; the length check moves to the backend's validators, whose 400 message lands in `pwError` via `ApiError.message`; the submit button gets `disabled={changePw.isPending}`.)

- [ ] **Step 1: Write the failing tests**

`profile.test.tsx` — mocked seeker auth incl. `refreshUser: vi.fn()`; assert: header "Ava Reyes" + goals; education tab lists "TU Berlin" with "Sep 2019 – Jul 2021"; skills tab lists Python/Advanced; adding a skill fires POST with `{skill_name, skill_level}` (capture body) and toasts; duplicate-400 override surfaces "already added" via toast; overview save fires the seeker PATCH and calls the mocked `refreshUser`.

`settings.test.tsx` — assert: email input disabled; save fires PATCH `/accounts/me/` without `email` key (capture body; dob/sex/photo present); password submit with mismatched confirm shows the local error and no request; matching submit fires `POST /accounts/change-password/` and toasts; a 400 `{current_password: ['Incorrect password.']}` override lands in the error line.

- [ ] **Step 2: Run — FAIL. Step 3: Apply deltas; run — PASS; full suite; commit**

```bash
git add src/pages/seeker/profile.tsx src/pages/settings.tsx src/pages/seeker/__tests__ src/pages/__tests__
git commit -m "feat(seeker): profile and settings on real API — real password change, read-only email"
```

---

### Task 13: Frontend — apply flow + derived hasApplied + NaN guards

**Files:**
- Modify: `src/components/jobs/apply-modal.tsx`, `src/pages/public/job-detail.tsx`, `src/pages/public/jobs.tsx`
- Test: `src/components/jobs/__tests__/apply-modal.test.tsx`; extend `src/pages/public/__tests__/job-detail.test.tsx`

Deltas:
- `apply-modal.tsx`: `import { applyToJob } from '@/lib/services'`; drop the `['has-applied', job.id]` invalidation (key no longer exists — `['applications']` invalidation already covers the derived check); mutation gains `onError: (err) => setError(err instanceof Error ? err.message : 'Could not send application')`.
- `job-detail.tsx`: remove `hasApplied` import; replace the query with:

```typescript
  const { data: applied } = useQuery({
    queryKey: ['applications'],
    queryFn: listApplications,
    enabled: Boolean(isSeeker && job),
    select: (apps) => apps.some((a) => a.jobId === id),
  })
```

(`listApplications` from `@/lib/services`; withdrawn applications still count — the backend's uniqueness constraint blocks re-applying.)
- `jobs.tsx`: guard URL numerics:

```typescript
  const minSalaryRaw = Number(params.get('minSalary') ?? '')
  const minSalary = Number.isFinite(minSalaryRaw) && minSalaryRaw > 0 ? String(minSalaryRaw) : ''
  const pageRaw = Number(params.get('page') ?? '1')
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1
```

(keeping the same downstream variable names/types the file already uses).

- [ ] **Step 1: Write the failing tests**

`apply-modal.test.tsx` — authed seeker fixture token; open modal with an adapted `JobWithCompany`; submit with cover text → POST `/jobs/apply/` body captured (`user_account: SEEKER_ID`, `job_post`, `cover_letter`), success toast, `onApplied` called; a 400 `{error: 'You have already applied for this job'}` override renders that message inline and keeps the modal open.

`job-detail.test.tsx` additions — with auth mocked as seeker + `setAccessToken` in the test: when the applications handler returns an application for `JOB_POST_ID`, the CTA renders disabled "Applied"; when it returns `paginated([])`, the CTA is "Apply now". Existing guest tests keep passing (query disabled → no applications fetch; **verify no unhandled-request error**, since guests never hit the gated handler).

Also extend `src/pages/public/__tests__/jobs.test.tsx`: `renderJobs('/jobs?minSalary=abc&page=zzz')` → request contains no `salary_floor` and `page=1`.

- [ ] **Step 2: Run — FAIL. Step 3: Apply deltas; run — PASS; full suite; commit**

```bash
git add src/components/jobs src/pages/public
git commit -m "feat(apply): real apply flow with inline API errors; hasApplied derived from the applications cache; URL numeric guards"
```

---

### Task 14: Frontend — held-over Slice-2 cleanup

**Files:**
- Modify: `src/lib/services/jobs.ts`, `src/lib/services/meta.ts` (no — resolution calls live in jobs.ts), `src/lib/api/public.ts`, `src/components/landing/featured-jobs.tsx`, `src/lib/services/__tests__/jobs.test.ts`, `src/lib/services/__tests__/meta.test.ts`, `src/lib/services/__tests__/companies.test.ts`, `src/pages/company/post-job.tsx`

One commit, mechanical items (each with its covering test where behavior exists):

- [ ] `src/lib/services/jobs.ts`: `const EMPTY = Object.freeze({ results: [] as JobWithCompany[], count: 0 })` — and `listJobs` resolves type/stream in parallel:

```typescript
  const [job_type, business_stream] = await Promise.all([
    type ? resolveJobTypeId(type) : Promise.resolve(undefined),
    stream ? resolveStreamId(stream) : Promise.resolve(undefined),
  ])
  if (job_type === null || business_stream === null) return EMPTY
```

- [ ] `src/lib/services/__tests__/jobs.test.ts`: assert exact UUIDs (`expect(q.get('job_type')).toBe(JOB_TYPE_FULLTIME_ID)`, `expect(q.get('business_stream')).toBe(STREAM_ID)`) instead of `toBeTruthy()`; add an unknown-stream short-circuit test mirroring the unknown-type one.
- [ ] Remove unused imports: `BUSINESS_STREAMS_LIST` from `meta.test.ts`, `publicCompanyDetail` from `companies.test.ts` (now used by Task 12's settings test? — no: it was unused in *companies.test.ts* specifically; if the Slice-3 fix-round test in that file now uses it, keep it), plus any the linter-less repo accumulated in `jobs.test.ts`.
- [ ] `src/lib/api/public.ts`: name the inline params type — `export interface PublicCompanyQuery { search?: string; business_stream?: string }` and use it in `getPublicCompanies`.
- [ ] Shared salary normalization: export from `src/lib/services/jobs.ts` a `normalizeSalary(min: string | null, max: string | null, type: SalaryType | ''): {min: number | null; max: number | null; type: SalaryType | null}` used by `adaptJob`, and re-use it in `featured-jobs.tsx`'s `loadFeatured` (replacing the inline `Number()`/`|| null` trio).
- [ ] `src/pages/company/post-job.tsx`: add `// TODO(slice-4): drop these fallbacks when the console moves off mock data — a real null here should surface, not default.` above the `?? 'yearly'` / `?? ''` hydration lines.
- [ ] **Verify + commit**

`npm run test` + `npm run typecheck` green.

```bash
git add src/lib src/components/landing src/pages/company/post-job.tsx
git commit -m "chore: slice-2 deferred cleanup — frozen EMPTY, parallel meta resolution, exact test assertions, shared salary normalizer"
```

---

### Task 15: Live e2e + frontend PR + DoD sweep

**Files:** none (verification + PR).

- [ ] **Step 1: Servers**

Stop any dev server still running from earlier sessions. Backend runs **from the worktree** (the Slice-3 branch): `cd C:/Users/almos/Projects/job-board-api-slice3 && uv run python manage.py runserver 8000` (Postgres service must be running; it shares the dev DB `job_board`, already seeded). Frontend: `npm run dev`.

- [ ] **Step 2: Full seeker journey (Playwright/Chrome MCP)**

1. Fresh anonymous visit: network log shows **zero** `token/refresh` calls and a clean console.
2. Register a new seeker → dashboard greeting with the real first name.
3. Profile: edit overview (name change reflects in the header after save); add education (month inputs), experience, a new free-text skill ("Terraform"/Advanced), then the **same skill again → clean error toast** ("already added"), delete one of each.
4. Settings: email input read-only; change dob/sex/photo → persists after reload; change password with wrong current → inline "Incorrect password."; with correct current → success; log out, log back in with the NEW password.
5. Browse `/jobs` → open a role → Apply with cover letter → toast; button flips to "Applied" (stays after reload); applications list shows the row with job title/company; withdraw it → status chip "Withdrawn"; the job detail still shows "Applied" (uniqueness).
6. Application detail: cover letter, salary, timeline render; deep-link an unknown id → not-found state.
7. Dashboard: stats reflect reality; recommended jobs render.
8. Regression: company console screens still render on mock data; public browse unaffected; `npm run test` + `npm run typecheck` final green.

- [ ] **Step 3: Frontend PR (never merge)**

```bash
git -c credential.helper= -c credential.helper='!gh auth git-credential' push origin feat/slice3-seeker
gh pr create --base staging --head feat/slice3-seeker \
  --title "Slice 3: seeker area on real data" \
  --body "Seeker dashboard/applications/profile/settings + apply flow on the real API via services adapters; session-hint bootstrap (no more guest console 401s); real change-password with read-only email; Slice-2 deferred cleanup. Companion backend PR: <backend PR URL>. Spec: docs/superpowers/specs/2026-08-06-slice3-seeker-design.md"
```

Report both PR URLs. **The frontend PR must not be merged before the backend PR** — note that in the PR body if the backend one is still open.

---

## Self-review notes (done at plan time)

- **Spec coverage:** §4.1→Task 2, §4.2→Task 3, §4.3→Task 4, §4.4→Task 5, §5.1–5.3→Tasks 6–9, §5.4–5.5→Task 10, §6→Tasks 11–13, §7→Task 14, §9/§10→every task + Task 15.
- **Type consistency:** `ApplicationJob`/`ApplicationWithJob` (Task 6) match Task 9's adapter and Tasks 11–13's pages; fixture names (Task 7) match Tasks 8–13 usage; `changePassword` flows barrel→settings; backend serializer names (`JobPostActivityReadSerializer`, `SeekerSkillSetReadSerializer`, `JobPostActivityUpdateSerializer`) are used consistently across Tasks 2–3 and the MSW shapes in Task 7 mirror Task 2's tested output exactly.
- **Known judgment points for implementers:** exact `assertNumQueries` constant (measure once, pin); existing backend tests updated not deleted (Task 3 Step 4); auth-context test harness helper names adapted to the real file (Task 10 Step 1 says so explicitly).
- The backend `login`-view throttle-scope wiring is referenced (read-and-mirror) rather than transcribed — the exact mechanism lives in the file the implementer edits.
