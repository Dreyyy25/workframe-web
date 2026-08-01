# Backend Handoff — httpOnly Refresh-Cookie Auth (Frontend Integration, Slice 1)

- **Date:** 2026-08-01
- **Target repo:** `Job-Board-API-only` (this document is written for a Claude session working in that repo)
- **Requested by:** the frontend repo `workframe-web` — approved spec `docs/superpowers/specs/2026-07-01-backend-integration-design.md` §6.5
- **Scope:** `apps/accounts/` + a settings block. No models, no migrations, no URL path changes, no changes to any other app.

## 1. Why

The React frontend is replacing its mock auth with real JWT auth. The chosen token model:

- **Access token** — returned in the JSON body, held in frontend memory only. Unchanged behavior.
- **Refresh token** — must live in an **httpOnly cookie** set by the server, so JavaScript can never read it. Today the API returns it in the response body; after this change it must **never appear in a response body again**.

The frontend dev server proxies `/api/*` → `http://localhost:8000` (no path rewrite), so the browser sees one origin and a `SameSite=Lax`, path-scoped cookie flows correctly.

## 2. Current state (verify before starting; line numbers may drift)

- `apps/accounts/views.py` — FBVs `register`, `login`, `logout`, `me`; simplejwt's `TokenRefreshView` is subclassed as `ThrottledTokenRefreshView` (throttle scope `token_refresh`) referenced from `apps/accounts/urls.py`.
- `apps/accounts/services.py` — `register_user` / `login_user` mint tokens via `_mint_tokens` (custom claims `user_id`, `email`, `user_type`); `logout_user(refresh_str)` blacklists.
- `jobApp/settings/base.py` — `SIMPLE_JWT`: access 60 min, refresh 7 days, `ROTATE_REFRESH_TOKENS=True`, `BLACKLIST_AFTER_ROTATION=True`. Settings split: `base.py` / `development.py` / `production.py`.
- Login/register currently respond `{message, user, tokens: {refresh, access}}` (+ `profile` on register). Logout reads `refresh` from the request **body**. Refresh reads/returns `refresh` via the standard simplejwt body contract.
- Tests: `apps/accounts/tests.py`, DRF `APITestCase` style, run with `uv run python manage.py test apps.accounts`.

## 3. Required changes

### 3.1 Settings — cookie attributes (config, not code)

In `jobApp/settings/base.py`, add a block the views read from (so prod can flip attributes without code changes):

```python
AUTH_REFRESH_COOKIE = {
    "NAME": "refresh_token",
    "PATH": "/api/v1/accounts/",          # scoped: only auth endpoints ever receive it
    "SAMESITE": "Lax",
    "HTTPONLY": True,
    "MAX_AGE": int(SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),  # derive, don't hardcode
}
```

- `development.py`: `AUTH_REFRESH_COOKIE_SECURE = False`
- `production.py`: `AUTH_REFRESH_COOKIE_SECURE = True` (add a comment: cross-domain deploys additionally need `SameSite=None` + pinned `CORS_ALLOWED_ORIGINS` — future hardening, not now)

### 3.2 New helper — `apps/accounts/cookies.py`

Keep HTTP concerns out of `services.py` (its layering doc says services never touch request/response):

```python
def set_refresh_cookie(response, refresh_token: str) -> None: ...
def delete_refresh_cookie(response) -> None: ...
```

Both read `settings.AUTH_REFRESH_COOKIE` / `AUTH_REFRESH_COOKIE_SECURE`. `delete_refresh_cookie` must pass the **same `path` and `samesite`** to `response.delete_cookie()` or the browser won't remove it.

### 3.3 `login` and `register` views

- **Do not touch `services.py`** — it still mints and returns both tokens (keeps service-layer tests green).
- In the views: pop `refresh` out of the tokens dict, call `set_refresh_cookie(response, refresh)`, and return `tokens: {"access": ...}` only.
- Everything else in the bodies stays identical: `{message, user: {id, email, user_type}, tokens: {access}}`, plus `profile` on register (201).
- Update the drf-spectacular inline serializers so the schema no longer advertises `tokens.refresh`.

### 3.4 Refresh — cookie-based, rotated cookie back

Replace `ThrottledTokenRefreshView` with a `CookieTokenRefreshView(TokenRefreshView)` (keep `throttle_scope = "token_refresh"`, keep the URL `token/refresh/` unchanged):

- Read the refresh token **from the cookie only** (no body fallback — the Postman collection drifting is accepted).
- Missing cookie → **401** `{"detail": "..."}`.
- Invalid/blacklisted token → 401 (simplejwt default shape `{"detail", "code"}` is fine — the frontend normalizes it).
- Success → **200** `{"access": "..."}` in the body (no `refresh` key), and set the **rotated** refresh token as a fresh cookie via `set_refresh_cookie` (rotation + blacklist are already enabled in `SIMPLE_JWT` — do not change those flags).

### 3.5 `logout` view

- Read the refresh token from the **cookie** instead of `request.data`.
- Found → `services.logout_user(value)` (blacklists), then `delete_refresh_cookie(response)`, respond **205** (unchanged).
- Missing/invalid → **400** `{"error": "..."}` (existing error shape), and still call `delete_refresh_cookie` defensively.

### 3.6 Unchanged

`token/verify/`, `me/`, all throttle scopes and rates, `SIMPLE_JWT` flags, all other apps, all URL paths.

## 4. Tests (TDD — write these first)

New `CookieAuthTests(APITestCase)` in `apps/accounts/tests.py`:

1. **Register & login** responses: cookie named per settings is set with `httponly=True`, `samesite='Lax'`, `path='/api/v1/accounts/'`, correct `max-age`; `response.data["tokens"]` has `access` and **no** `refresh`; `user` payload unchanged. (Assert via `response.cookies[name]` morsel attributes.)
2. **Refresh happy path**: set `self.client.cookies[name] = <valid refresh>` → 200, body has `access` only, response sets a cookie whose value **differs** from the request's (rotation), and replaying the old value now → 401 (blacklisted).
3. **Refresh without cookie** → 401.
4. **Logout**: with cookie → 205, old refresh blacklisted (subsequent refresh with it → 401), response deletes the cookie (empty value / `max-age=0`). Without cookie → 400.

**Existing tests that will break and must be rewritten:** the logout tests currently post `{refresh}` in the body — move them to the cookie mechanism (set `self.client.cookies[...]`). Any test asserting `tokens.refresh` in a login/register **response body** must drop that assertion. Service-layer tests are unaffected.

Run: `uv run python manage.py test apps.accounts`, then the full `uv run python manage.py test`.

## 5. Manual verification (curl)

```bash
# login: inspect Set-Cookie attrs (HttpOnly; Path=/api/v1/accounts/; SameSite=Lax; Max-Age=604800)
curl -i -c jar.txt -X POST http://localhost:8000/api/v1/accounts/login/ \
  -H "Content-Type: application/json" -d '{"email":"<e>","password":"<p>"}'
# body must contain tokens.access and NOT tokens.refresh

# refresh with cookie jar: 200 {access}, rotated Set-Cookie
curl -i -b jar.txt -c jar.txt -X POST http://localhost:8000/api/v1/accounts/token/refresh/

# replay the OLD jar (pre-rotation copy) → 401 blacklisted
# logout with jar → 205, Set-Cookie deleting the cookie
```

## 6. Acceptance criteria

- [ ] No response body anywhere contains a refresh token.
- [ ] Login/register set the httpOnly, path-scoped, Lax cookie; refresh rotates it; logout blacklists + deletes it.
- [ ] Refresh with no/invalid cookie → 401; logout with no cookie → 400; shapes as in §3.4/§3.5.
- [ ] Cookie attributes come from settings; `Secure` differs dev (False) vs prod (True).
- [ ] `uv run python manage.py test` fully green, including rewritten logout tests and new `CookieAuthTests`.
- [ ] OpenAPI schema (`/api/schema/`) no longer lists `tokens.refresh`.

## 7. Follow-up found during frontend integration review (2026-08-01)

**Status of §1–§6: DONE on `staging`** (commits `83e5f1f`…`8b6923a`) and verified end-to-end
from the frontend. One additional pre-existing issue surfaced by the review:

- **`JobLocationViewSet` requires authentication for reads** (`apps/jobs/views.py`,
  `permission_classes = [IsAuthenticated]`) even though its docstring says "Everyone can
  view locations", and every sibling reference endpoint (job-types, business-streams,
  job-posts) allows anonymous reads. Effect: the frontend landing page's featured-jobs
  query (`GET /api/v1/jobs/job-locations/`) 401s for logged-out visitors, so anonymous
  users only ever see seed fallback content. Fix: change to
  `permission_classes = [IsAuthenticatedOrReadOnly]` (matches the docstring — everyone
  reads, authenticated users create) + a small test asserting anonymous GET returns 200.
  Needed before frontend Slice 2 (public browse on real data).

## 8. Conventions

- Work on a feature branch (e.g. `feat/refresh-cookie-auth`), conventional commits (`feat(accounts): ...`, `test(accounts): ...`).
- Do **not** add a `Co-Authored-By: Claude` trailer to commits.
- `API_DOCUMENTATION.md` / Postman collection drift is accepted for now; update `CLAUDE.md`'s auth notes if it describes the refresh contract.
