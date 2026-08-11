# Frontend Docker Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production Docker image for `workframe-web` — nginx serving the built SPA and reverse-proxying `/api` to the Render backend — plus a local compose harness and a Render runbook.

**Architecture:** Multi-stage Dockerfile (node:24-alpine build → nginx:stable-alpine serve). nginx config is an env-templated file rendered at container start by the official image's built-in envsubst mechanism; `API_ORIGIN` selects the backend per environment while the SPA is built once with the relative base `/api/v1`. Same-origin is the point: the refresh cookie only works because the browser sees one host.

**Tech Stack:** Docker multi-stage builds, official nginx image template mechanism, docker compose, Render (existing image deploys).

**Spec (governing document):** `docs/superpowers/specs/2026-08-11-frontend-docker-deploy-design.md`. Spec wins over plan on conflict — flag it.

## Global Constraints

- Repo: `C:\Users\almos\projects\workframe-web`, branch `feat/frontend-docker` (exists, spec committed). Work in place. **Zero changes under `src/`** — this plan adds infra files only.
- Conventional commits, **NO Co-Authored-By/attribution trailer** (repo rule).
- Push incantation (plain push hangs): `git -c credential.helper= -c credential.helper='!gh auth git-credential' push -u origin feat/frontend-docker`.
- Exactly two runtime env vars: `API_ORIGIN` (required, scheme+host, no trailing slash, no path) and `PORT` (Dockerfile default 80).
- **No path rewriting in the proxy** — the refresh cookie is path-scoped to `/api/v1/accounts/` and must match the browser-requested URL.
- `docker --version` must work before Task 1's build steps; if the daemon isn't running/installed, return BLOCKED (the user runs Docker Desktop on Windows — it may just need starting).
- The live backend for verification: the deployed Render API (find its URL in `C:\Users\almos\Projects\Job-Board-API-only\DEPLOYMENT.md` notes or ask the controller; format `https://<app>.onrender.com`).

---

### Task 1: Image — `.dockerignore`, `Dockerfile`, nginx template

**Files:**
- Create: `.dockerignore`, `Dockerfile`, `docker/nginx.conf.template`

**Interfaces:**
- Produces: an image that serves the SPA on `${PORT}` (default 80) and proxies `/api/*` to `${API_ORIGIN}`; `/healthz` → 200 `ok`. Task 2's compose builds this exact Dockerfile with env from `.env.docker`.

- [ ] **Step 1: Preflight**

Run: `docker --version` — any modern version is fine. If the command fails, return BLOCKED (Docker Desktop not running).

- [ ] **Step 2: Create `.dockerignore`**

```
node_modules
dist
dist-ssr
.vite
.git
.playwright-mcp
.superpowers
docs
coverage
*.local
.env
.env.*
!.env.example
Dockerfile
docker-compose.yml
DEPLOYMENT.md
```

(`.env.*` excludes `.env.docker`; `.env.example`/`.env.development` are dev-only files the build doesn't need — the Dockerfile sets `VITE_API_BASE_URL` explicitly, so excluding them keeps the build deterministic. `!.env.example` is unnecessary for the build but harmless; drop it if you prefer strictness — nothing in the image reads it.)

- [ ] **Step 3: Create `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1

# --- Builder: deterministic production build --------------------------------
FROM node:24-alpine AS builder

WORKDIR /app

# Lockfile-only layer: dependency changes bust this cache, code changes don't.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Relative base is correct on EVERY host because nginx proxies /api same-origin.
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# --- Runtime: nginx serving the SPA + /api reverse proxy --------------------
FROM nginx:stable-alpine

# The official entrypoint renders /etc/nginx/templates/*.template with envsubst
# (only variables present in the environment are substituted; nginx runtime
# vars like $uri survive) into /etc/nginx/conf.d/. Remove the stock config so
# ours is the only server block.
RUN rm /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

# Render injects PORT; this is the local default.
ENV PORT=80

EXPOSE 80
```

(No `USER`, no `ENTRYPOINT`/`CMD` overrides — the official image's entrypoint handles template rendering and privilege-dropping for workers.)

- [ ] **Step 4: Create `docker/nginx.conf.template`**

```nginx
# Rendered by the nginx image's entrypoint (envsubst on ${PORT}/${API_ORIGIN})
# into /etc/nginx/conf.d/default.conf at container start.
server {
    listen ${PORT};
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy same-origin always;

    # Render health check — answered by nginx itself so a backend cold start
    # can never fail the frontend's health probe.
    location = /healthz {
        default_type text/plain;
        return 200 "ok";
    }

    # Same-origin API: pass the ORIGINAL URI through untouched. The refresh
    # cookie is path-scoped to /api/v1/accounts/ — any rewrite breaks auth.
    location /api/ {
        # Literal URL after envsubst — no resolver needed.
        proxy_pass ${API_ORIGIN};
        # Render routes by SNI + Host; nginx's default Host ($proxy_host) is
        # the backend's own hostname, which is exactly right — don't override.
        proxy_ssl_server_name on;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        # Free-tier cold starts can take ~60s; don't 504 them.
        proxy_read_timeout 90s;
        proxy_connect_timeout 90s;
    }

    # Vite content-hashed bundles: safe to cache forever.
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable" always;
        add_header X-Content-Type-Options nosniff always;
        try_files $uri =404;
    }

    # SPA fallback — deep links (/jobs/123, /company/dashboard) serve the app.
    location / {
        add_header Cache-Control "no-cache" always;
        add_header X-Content-Type-Options nosniff always;
        add_header Referrer-Policy same-origin always;
        try_files $uri /index.html;
    }
}
```

(Note the nginx `add_header` inheritance rule: a location with its own `add_header` inherits NONE from the server block — that's why `/assets/` and `/` repeat the security headers. `${API_ORIGIN}` and `${PORT}` are the only env substitutions; `$uri`/`$proxy_host` are not env vars and survive envsubst.)

- [ ] **Step 5: Build**

Run: `docker build -t workframe-web:dev .`
Expected: both stages succeed. If `npm run build` fails here but works on the host, diagnose (usually a file excluded by `.dockerignore` that the build needs) before touching anything else.

- [ ] **Step 6: Smoke-test the container standalone**

```powershell
docker run --rm -d -p 8080:80 -e API_ORIGIN=https://example.com --name wf-smoke workframe-web:dev
curl.exe -s http://localhost:8080/healthz            # expect: ok
curl.exe -s -o NUL -w "%{http_code}" http://localhost:8080/            # expect: 200
curl.exe -s -o NUL -w "%{http_code}" http://localhost:8080/company/dashboard   # expect: 200 (SPA fallback)
curl.exe -s -I http://localhost:8080/ | Select-String "Cache-Control"  # expect: no-cache
docker exec wf-smoke sh -c "ls /usr/share/nginx/html/assets | head -3" # hashed bundles exist
docker exec wf-smoke sh -c "cat /etc/nginx/conf.d/default.conf | grep proxy_pass"  # expect: literal https://example.com
docker exec wf-smoke sh -c "which node || echo NO-NODE"                # expect: NO-NODE (stage-2 only)
docker stop wf-smoke
```

Also verify an asset request: fetch one hashed filename from the `ls` above via `curl.exe -s -I http://localhost:8080/assets/<file>` — expect 200 + `immutable` Cache-Control.

- [ ] **Step 7: Commit**

```powershell
git add .dockerignore Dockerfile docker/nginx.conf.template
git commit -m "feat(docker): production image — node build stage, nginx SPA serve + same-origin /api proxy"
```

---

### Task 2: Local parity harness — compose, env example, gitignore

**Files:**
- Create: `docker-compose.yml`, `.env.docker.example`
- Modify: `.gitignore` (add `.env.docker` under the `# Node / Vite frontend` block, next to the existing `.env` line)

**Interfaces:**
- Consumes: Task 1's Dockerfile.
- Produces: `docker compose up --build` serving the app on `http://localhost:8080` against whatever `API_ORIGIN` is in `.env.docker`.

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
# Local parity harness: runs the production image on localhost:8080.
# Copy .env.docker.example -> .env.docker and set API_ORIGIN first.
services:
  web:
    build: .
    env_file: .env.docker
    ports:
      - "8080:80"
```

- [ ] **Step 2: Create `.env.docker.example`**

```
# Backend the /api proxy forwards to — scheme + host, NO trailing slash, NO path.
# Live Render API (primary verification mode):
API_ORIGIN=https://<your-app>.onrender.com
# ...or a local backend (Docker Desktop resolves host.docker.internal to Windows):
# API_ORIGIN=http://host.docker.internal:8000
```

- [ ] **Step 3: `.gitignore`** — in the `# Node / Vite frontend` block, directly after the `.env` line, add:

```
.env.docker
```

- [ ] **Step 4: Live verification against the real backend**

Copy `.env.docker.example` → `.env.docker`, set `API_ORIGIN` to the deployed Render API URL (Global Constraints note). Then:

Run: `docker compose up --build -d`

Browser checklist at `http://localhost:8080` (use Playwright MCP browser tools if running as an agent; record pass/fail each):
1. Public jobs/companies pages show real data (proves the proxy path end-to-end).
2. Log in with a real account (register a throwaway seeker if none is at hand).
3. **Reload the page → still logged in.** This is the single most load-bearing check: it proves the refresh cookie was set on localhost through the proxy and round-tripped back. (Secure cookies work on http://localhost — browsers treat it as a trustworthy origin.)
4. Deep-link reload on a protected route → app loads, no 404, no bounce to /login.
5. Log out → reload → logged out.
6. `curl.exe -s http://localhost:8080/healthz` → `ok`.

Note: the first API request may take ~30-60s if the Render free instance is cold — that's the cold start the 90s proxy timeout exists for; it is not a failure.

Then: `docker compose down`.

- [ ] **Step 5: Repo hygiene check**

Run: `git status --porcelain` — `.env.docker` must NOT appear (ignored). Run `npm run test` and `npm run typecheck` — both green and untouched (no `src/` changes on this branch).

- [ ] **Step 6: Commit**

```powershell
git add docker-compose.yml .env.docker.example .gitignore
git commit -m "feat(docker): local compose harness with API_ORIGIN env selection"
```

---

### Task 3: `DEPLOYMENT.md` + push + PR

**Files:**
- Create: `DEPLOYMENT.md` (repo root, mirroring the backend repo's runbook style — read `C:\Users\almos\Projects\Job-Board-API-only\DEPLOYMENT.md` first for tone/structure)

**Interfaces:**
- Consumes: Tasks 1-2 (documents exactly what they built).

- [ ] **Step 1: Write `DEPLOYMENT.md`** covering, in this order (concrete commands, no filler):

1. **What this image is** — one paragraph: nginx serves the built SPA and reverse-proxies `/api/*` to `API_ORIGIN`; same-origin is required by the backend's cookie auth (one sentence on why; link the spec).
2. **Build and verify locally** — `docker compose up --build` after copying `.env.docker.example` → `.env.docker`; the six-point checklist from Task 2 Step 4 in short form; the cold-start note.
3. **Tag and push (user-owned)** — `docker build -t <registry>/<ns>/workframe-web:<tag> .` + `docker push …`; build from a clean checkout of the release branch.
4. **Render web service** — Web Service → Existing image; health check path `/healthz`; `PORT` injected automatically (image default 80 is local-only); environment: `API_ORIGIN=https://<backend>.onrender.com`. Explicitly: **the backend needs no new env** — no CORS entry (the browser sees one origin) and its `ALLOWED_HOSTS` already matches because the proxy sends the backend's own hostname as `Host`.
5. **Future: custom domain** — short note: with `app.example.com` + `api.example.com` (same-site subdomains) the proxy becomes optional; nothing in this setup blocks that move.

- [ ] **Step 2: Commit, push, PR**

```powershell
git add DEPLOYMENT.md
git commit -m "docs(docker): frontend deployment runbook — local verify, registry push, Render setup"
git -c credential.helper= -c credential.helper='!gh auth git-credential' push -u origin feat/frontend-docker
gh pr create --repo Dreyyy25/workframe-web --base staging --head feat/frontend-docker --title "feat: frontend Docker image — nginx SPA serve + same-origin /api proxy, compose harness, Render runbook" --body "Implements docs/superpowers/specs/2026-08-11-frontend-docker-deploy-design.md: multi-stage image (node:24-alpine build -> nginx:stable-alpine), env-templated nginx config (API_ORIGIN/PORT), no path rewriting (cookie-auth safe), /healthz, SPA fallback, asset caching; compose parity harness; DEPLOYMENT.md for Render. Zero src/ changes. Verified live against the Render API incl. login-survives-reload."
```

Do NOT merge. Report the PR URL.

---

## Self-Review Notes (already applied)

- Spec coverage: §3 file list → T1/T2/T3; §4 Dockerfile → T1S3; §5 nginx details (incl. add_header inheritance, envsubst safety, no-Host-override, 90s timeout, healthz, immutable assets) → T1S4; §6 harness + both API_ORIGIN modes + Secure-cookie-on-localhost note → T2; §7 DoD → T1S6 + T2S4/S5; §8 runbook → T3; §9 exclusions honored (no CSP, no full-stack compose, no IaC).
- No placeholders; all file contents are complete and final.
- `workframe-web:dev` tag in T1 is local-only; T3's registry tagging is the deploy path.
