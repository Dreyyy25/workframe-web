# Backend Integration — Slice 1: API Client + Real JWT Auth

- **Date:** 2026-07-01
- **Status:** Approved design, ready for implementation planning
- **Repos touched:** `workframe-web` (frontend, this repo) and the sibling Django API at `../Job-Board-API-only`
- **Branch:** `feat/frontend`

## 1. Summary

Replace the frontend's in-memory mock backend with the real Django + DRF Job Board API,
starting with the authentication foundation. This slice delivers real JWT auth (in-memory
access token + httpOnly refresh cookie), an authenticated HTTP client with silent
auto-refresh, a rewritten auth context, and protected-route session bootstrap. No data
screens change in this slice — the 33 mock data services keep running until later slices.

## 2. Current state

**Frontend (`workframe-web`):** React 18 + Vite + TypeScript + Tailwind + shadcn/ui.
TanStack Query v5 is already wired (`QueryClientProvider` in `src/App.tsx`).
react-router-dom v6 with a `RequireAuth` role guard. There is a single data seam — 33 async
functions in `src/lib/mock/services.ts` are the only data surface every screen touches — and
a mock `src/lib/auth/auth-context.tsx` (localStorage only, no network, no tokens). Only the
public landing page talks to the real API today, via `src/lib/api/{client.ts,public.ts}`
(`apiGet` is GET-only, no auth header). `VITE_API_BASE_URL` is already defined in `.env`.

**Backend (`Job-Board-API-only`):** Django + DRF, JWT via `djangorestframework-simplejwt`.
All resource PKs are UUIDv4. Responses are snake_case, flat, with UUID foreign keys. DRF
`PageNumberPagination` envelope `{count, next, previous, results}`, default `page_size=20`,
`page_size` query param capped at 100. Base URL `http://localhost:8000/api/v1/` (trailing
slashes required). CORS in dev: `CORS_ALLOW_ALL_ORIGINS=True`, `CORS_ALLOW_CREDENTIALS=True`.

Relevant auth facts (verified against code, not the partially-inaccurate `API_DOCUMENTATION.md`):

- `AUTH_USER_MODEL = accounts.UserAccount` — custom user, login by **email**, PK is a UUID.
- `user_type` is `'job_seeker' | 'company'` — **identical** to the frontend `UserType` union.
- Tokens: `ACCESS_TOKEN_LIFETIME = 60 min`, `REFRESH_TOKEN_LIFETIME = 7 days`,
  `ROTATE_REFRESH_TOKENS = True`, `BLACKLIST_AFTER_ROTATION = True` (each refresh returns a
  **new** refresh token and blacklists the old one). Header type `Bearer`. Custom claims on
  the token: `user_id`, `email`, `user_type`.
- A `post_save` signal auto-creates a blank profile on registration: `SeekerProfile` for
  seekers, `Company` (+ default "Uncategorized" `BusinessStream`) for companies. So the
  human-readable **name lives on the profile, not on `UserAccount`** (which has only
  email/user_type/etc.).

Auth endpoints (all under `/api/v1/accounts/`):

| Method | Path | Auth | Request | Success response |
|---|---|---|---|---|
| POST | `/register/` | none | `email, password, user_type` (+ optional dob/contact/sex/image) | 201 `{message, user:{id,email,user_type}, tokens:{refresh,access}, profile}` |
| POST | `/login/` | none | `email, password` | 200 `{message, user:{id,email,user_type}, tokens:{refresh,access}}` (no profile) |
| POST | `/logout/` | Bearer | `{refresh}` | 205 empty (blacklists refresh) |
| POST | `/token/refresh/` | none | `{refresh}` | 200 `{access, refresh}` (rotated) |
| POST | `/token/verify/` | none | `{token}` | 200 `{}` |
| GET | `/me/` | Bearer | — | 200 `UserAccount {id,email,user_type,date_of_birth,contact_number,sex,user_image_url,is_active,last_login,created_at,updated_at}` |

Profile lookups used for display name (both keyed by the user's UUID):

- Seeker: `GET /api/v1/seekers/profiles/{userId}/` → `{user_account, first_name, last_name, contact_details, goals, resume_url, ...}`
- Company: `GET /api/v1/companies/dashboard/{userId}/` → `{company:{company_name, ...}, images:[...]}`

Backend error shapes the client must normalize (three variants):

- DRF: `{"detail": "..."}` (401/403/404), optionally `{"detail","code","messages"}` for JWT.
- Custom function views (login, logout, apply, dashboards): `{"error": "..."}`.
- Serializer validation (register, PATCH): field-keyed dict `{"email": ["..."], "password": ["..."]}`.

## 3. Goals / Non-goals

**Goals (Slice 1):**

1. A user can **register**, **log in**, and **log out** against the real Postgres-backed API.
2. Sessions **survive a page reload** via a silent refresh (no visible re-login).
3. Access-token expiry triggers a **transparent auto-refresh + retry**; a hard refresh
   failure logs the user out cleanly and redirects to `/login`.
4. Role-guarded routes (`RequireAuth`) behave correctly, including during the async
   bootstrap (no premature bounce to `/login`).
5. The refresh token is **never readable by JavaScript** (httpOnly cookie); the access token
   lives only in memory.

**Non-goals (deferred to later slices):**

- Migrating any of the 33 data services or their screens (jobs, applications, profiles,
  applicants) off mock data.
- Reorganizing domain types out of `src/lib/mock/types.ts` (only auth types are added now).
- Production CORS/cookie hardening beyond leaving clear config seams (documented, not wired).
- CSRF double-submit token (SameSite=Lax + path-scoped cookie is the Slice-1 mitigation).

## 4. Decisions (locked)

| # | Decision | Choice |
|---|---|---|
| 1 | Backend modifiable? | **Yes** — targeted changes allowed in the sibling repo. |
| 2 | Sequencing | **Foundation-first, in slices.** This spec = Slice 1. |
| 3 | Token storage | **In-memory access + httpOnly refresh cookie.** |
| 4 | Shape adaptation | **Adapter layer at the existing 33-function seam** + selective backend nesting (relevant to later slices). |
| 5 | Demo-login buttons | **Removed** (no backend equivalent). |
| 6 | Testing | **Vitest + MSW** for client/auth logic + **manual e2e** against the live backend. |

## 5. Roadmap (context for the whole migration)

- **Slice 1 — Foundation (this spec):** HTTP client + real JWT auth + auth-context rewrite + route bootstrap.
- **Slice 2 — Public browse:** `listJobs` / `getJob` / `listCompanies` / `getCompany` + meta lists → real endpoints; backend adds nested company summary on job posts so public cards show the employer.
- **Slice 3 — Seeker:** profile (education / experience / skills), applications list/detail, apply flow.
- **Slice 4 — Company:** dashboard, manage jobs, applicants (backend adds denormalized applicant data), company profile / images.

Each later slice gets its own spec → plan → implementation.

## 6. Slice 1 — detailed design

### 6.1 Frontend module layout

```
src/lib/api/
  client.ts   ← EXTEND: apiFetch core + apiGet/apiPost/apiPatch/apiPut/apiDelete + ApiError + in-memory access token + single-flight refresh
  auth.ts     ← NEW:    typed register/login/logout/getMe/refresh calls to /accounts/*
  types.ts    ← EXTEND: UserAccount, auth request/response types (keep Paginated<T>)
src/lib/auth/
  auth-context.tsx ← REWRITE bodies; keep useAuth surface; add isLoading; drop loginDemo
  session.ts       ← NEW: map backend user + profile → SessionUser (adds id, derives name)
```

`src/lib/mock/*` and the 33 data services are untouched. Domain-type imports
(`AppStatus`, etc.) stay pointed at `mock/types`. `UserType` already matches the backend.

### 6.2 Token & session model

- **Access token:** module-level variable in `client.ts`, memory only, never persisted.
  Set via `setAccessToken()` / read internally / cleared via `clearAccessToken()`.
- **Refresh token:** httpOnly cookie set by the backend; the browser sends it automatically
  on `credentials: 'include'` requests. The frontend never reads or stores it.
- **Bootstrap (runs on every app load), owned by `AuthProvider`:**
  1. `isLoading = true`.
  2. `POST /accounts/token/refresh/` with the cookie. On **200**: store the new access token
     in memory, `GET /me/` for `id` / `email` / `user_type`, fetch the seeker/company profile
     for the display name, build `SessionUser`, set `user`. On **401**: `user = null` (not
     logged in).
  3. `isLoading = false`.
- `RequireAuth` renders a lightweight splash (or null) while `isLoading` so a logged-in user
  is **not** redirected to `/login` mid-bootstrap. Existing role logic applies once loaded.

### 6.3 HTTP client (`client.ts`)

- `API_BASE` from `import.meta.env.VITE_API_BASE_URL` (trailing slash stripped). In dev this
  is `/api/v1` (see §6.6 proxy); prod uses the absolute URL.
- `apiFetch<T>(path, opts)` where `opts = { method?, body?, params?, auth?, _isRetry? }`:
  - Builds the URL + query params; sets `Accept`/`Content-Type: application/json`.
  - Always sends `credentials: 'include'` (so the refresh cookie flows).
  - When an access token is in memory, adds `Authorization: Bearer <access>`.
  - On `!res.ok`, throws `ApiError` (see below).
  - **Single-flight auto-refresh:** on a `401` from an authorized call (and not already a
    retry, and not the refresh call itself), await a shared module-level `refreshPromise`
    that calls `/accounts/token/refresh/` exactly once; concurrent 401s reuse it. On success,
    store the new access token and retry the original request once (`_isRetry: true`). On
    refresh failure, `clearAccessToken()` and invoke a **registered `onSessionExpired`
    callback** (set by `AuthProvider` at mount) that clears user state and navigates to
    `/login` — the client never imports the router directly — then rethrow.
- Thin helpers: `apiGet`, `apiPost`, `apiPatch`, `apiPut`, `apiDelete` delegate to `apiFetch`.
- **`ApiError`** (class extending `Error`): carries `.status`, `.body` (parsed), a normalized
  human `.message`, and `.fieldErrors: Record<string, string[]>`. Its constructor detects the
  three shapes — `{detail}`, `{error}`, and field-keyed validation dicts — and populates
  `.message` and `.fieldErrors` accordingly.

### 6.4 Auth API (`auth.ts`) + context rewrite

`auth.ts` exposes typed functions: `register(input)`, `login(email, password)`,
`logout()`, `getMe()`, `refresh()`.

`auth-context.tsx` keeps the **exact `useAuth()` surface** —
`{ user, isSeeker, isCompany, login, register, logout }` — **plus `isLoading`**. `loginDemo`
is removed. Bodies become async and throw `ApiError`:

- **`login(email, password)`** → `POST /accounts/login/` → store access token → derive display
  name via the profile lookup → set `user`.
- **`register(input)`** is a **two-step** flow:
  1. `POST /accounts/register/` with `email, password, user_type` → returns tokens + the
     auto-created blank profile; store the access token.
  2. **PATCH the profile** with the name: seeker → `PATCH /seekers/profiles/{userId}/`
     (`first_name`, `last_name`); company → `PATCH /companies/profile/{companyId}/`
     (`company_name`, `business_stream`). The register form must now **collect a password**
     (it currently does not pass one) and, for companies, a business stream selection.
- **`logout()`** → `POST /accounts/logout/` (backend blacklists the cookie's refresh token
  and clears the cookie) → `clearAccessToken()` → `user = null`.
- **Display name** (`SessionUser.name`): `UserAccount` has no name, so login/bootstrap fetch
  the profile — seeker `GET /seekers/profiles/{userId}/` (first + last name), company
  `GET /companies/dashboard/{userId}/` (`company.company_name`). `SessionUser` gains an `id`
  (UUID); `name` is derived, with email as a fallback so the header never renders blank.

Consumers needing minor edits: `login.tsx` / `register.tsx` (await async calls, show server
errors, collect password), `require-auth.tsx` (honor `isLoading`), and the header/console
layouts already read only the stable surface.

### 6.5 Backend changes (sibling Django repo) — cookie auth

In `apps/accounts/` (views + a settings block for cookie attributes):

- **login / register:** after minting tokens, set the refresh token as an httpOnly cookie —
  `httponly=True`, `samesite='Lax'`, `secure=False` in dev / `True` in prod, `path` scoped to
  `/api/v1/accounts/`, `max_age` = 7 days (matching the refresh lifetime). Keep `access` in
  the JSON body; **stop returning `refresh` in the body**.
- **`token/refresh/`:** subclass the SimpleJWT view to read the refresh token from the
  **cookie** instead of the request body, return the new `access` in the body, and set the
  **rotated** refresh token as a fresh cookie (rotation + blacklist already enabled).
- **logout:** read the refresh token from the cookie, blacklist it, and delete the cookie.
- **CSRF:** `SameSite=Lax` + a cookie scoped to the accounts path means cross-site POSTs will
  not carry it → acceptable risk for Slice 1. A double-submit CSRF token is a documented
  future hardening step, not built now.
- Cookie name/attributes are read from settings so production can flip `Secure`/`SameSite`/
  domain without code changes.

### 6.6 Dev proxy

Add `server.proxy` to `vite.config.ts`: `'/api' → { target: 'http://localhost:8000',
changeOrigin: true }`, and set `VITE_API_BASE_URL=/api/v1` for dev. The browser then sees a
single origin (`localhost:5173`), so the refresh cookie is first-party and `SameSite=Lax`
works with no CORS-credentials or `SameSite=None` juggling. Production deploys frontend and
API under one domain (or pins `CORS_ALLOWED_ORIGINS` + `SameSite=None; Secure`).

### 6.7 Error handling & UX

`login.tsx` / `register.tsx` await the async calls and surface, from `ApiError`:

- **401** → "Invalid email or password."
- **400** → map `.fieldErrors` onto the matching inputs (e.g. `email` "already registered",
  `password` "too short"); fall back to `.message` for non-field errors.
- **429** → "Too many attempts, try again shortly" (throttle: login 10/min, register 5/min).
- Network/unknown → generic toast.

Authenticated pages rely on the transparent auto-refresh; a hard refresh failure clears the
session and redirects to `/login`.

### 6.8 Testing

- **Automated (Vitest + MSW — new harness, none exists today):**
  - `client.ts`: single-flight refresh (concurrent 401s share one refresh), retry-once,
    refresh-failure → logout, `ApiError` normalization across the three error shapes.
  - `auth-context.tsx`: bootstrap state machine (cookie present → hydrated user; cookie
    absent/401 → null), login/register/logout transitions.
- **Manual e2e against the running backend:** register → cookie set → reload stays logged in
  → force access expiry → silent refresh → logout clears the cookie → role-guarded routes
  gate correctly for each `user_type`.

## 7. Definition of done

- Register / login / logout work end-to-end against the real API and Postgres.
- Reload preserves the session via silent refresh; expired access auto-refreshes and retries.
- `RequireAuth` never bounces a logged-in user during bootstrap and enforces role correctly.
- The refresh token is httpOnly (not reachable from `document.cookie` / JS); the access token
  is memory-only.
- Vitest + MSW suite for `client.ts` and `auth-context.tsx` passes; manual e2e checklist passes.
- No data screen behavior changes (still on mock) — verified the app runs unchanged elsewhere.

## 8. Risks & open items

- **Bootstrap flash:** the initial silent refresh is async, so a brief splash is unavoidable;
  keep it minimal to avoid a jarring flash on protected routes.
- **Cross-repo coordination:** the cookie change spans both repos; the backend cookie work
  must land (or be stubbed) before the frontend refresh flow can be exercised e2e.
- **Register PATCH-after-create:** two network steps means a partial state is possible (user
  created, name PATCH fails). Handle by surfacing the error and allowing a retry of step 2;
  the account already exists and can log in.
- **Company business_stream:** registration auto-assigns "Uncategorized"; the register form
  should let a company pick a real stream (PATCH in step 2) or defer to profile editing.
- **Prod hardening (future):** pin CORS origins, `SameSite=None; Secure` (or same-domain
  deploy), and consider a CSRF double-submit token.
