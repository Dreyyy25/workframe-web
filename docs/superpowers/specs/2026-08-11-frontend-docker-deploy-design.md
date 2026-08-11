# Frontend Docker Deployment — nginx Front Door (Design)

**Date:** 2026-08-11
**Status:** Approved (design conversation 2026-08-11)
**Repo:** `workframe-web` only. **Zero backend changes; zero frontend source changes.**
**Context:** backend already ships its own production image + Postgres compose and runs on Render (`Job-Board-API-only/DEPLOYMENT.md`); the database is managed separately. This spec containerizes the frontend for deployment on its own server.

## 1. Goal & the constraint that shapes it

Deploy `workframe-web` as its own service, consuming the backend API already deployed on Render, **without changing the cookie-based auth**.

The auth model requires same-origin: the refresh cookie is httpOnly, `SameSite=Lax`, path-scoped to `/api/v1/accounts/`. A browser loading the app from one domain and calling the API on another treats those as cross-site and will not carry the cookie — login would break on reload. Dev solves this with Vite's `/api` proxy. Production solves it the same way: an nginx container that both serves the built SPA and reverse-proxies `/api/*` to the backend, so the browser only ever sees one origin (deployment pattern 1 from the design conversation; Vercel was ruled out — it cannot run containers).

## 2. Decisions locked with the user

1. **Pattern 1**: nginx reverse-proxy container; frontend on its own server (target: a second Render web service), backend and DB untouched where they are.
2. **Vercel is off the table.**
3. Cookie-based auth stays exactly as the backend implements it today.
4. Delivered as a real `Dockerfile` + `docker-compose.yml` in `workframe-web` (the user's original ask, made deploy-aware).

## 3. Deliverables (all in `workframe-web`)

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage production image (Node build → nginx serve) |
| `docker/nginx.conf.template` | nginx server config, env-templated |
| `docker-compose.yml` | Local parity harness for the image |
| `.env.docker.example` | Documents `API_ORIGIN` (copied to `.env.docker`, git-ignored) |
| `.dockerignore` | Keeps the build context lean |
| `DEPLOYMENT.md` | Build → verify → push → Render runbook |

`.gitignore` gains `.env.docker`.

## 4. Dockerfile

**Stage 1 — builder (`node:24-alpine`; Node 24 matches CI):**
- `WORKDIR /app`; copy `package.json` + `package-lock.json`; `npm ci` (its own layer — dependency changes bust the cache, code changes don't).
- Copy the rest; `ENV VITE_API_BASE_URL=/api/v1`; `npm run build`.
- The API base is **fixed at build time by design**: with the proxy, `/api/v1` is correct on every host, so the image needs no build args and one image serves all environments.

**Stage 2 — runtime (`nginx:stable-alpine`; implementer pins the current exact tag):**
- Copy `dist/` → `/usr/share/nginx/html`.
- Copy `docker/nginx.conf.template` → `/etc/nginx/templates/default.conf.template`. The official nginx image's entrypoint runs `envsubst` on `/etc/nginx/templates/*` at container start, substituting **only variables present in the environment** — nginx runtime variables like `$uri`/`$proxy_host` in the template are untouched (they are not env vars). No custom entrypoint needed.
- Remove the image's stock `/etc/nginx/conf.d/default.conf` if the template mechanism doesn't already replace it (implementer verifies image behavior; stock config must not shadow ours).
- `ENV PORT=80` (Render overrides by injecting `PORT`; plain `envsubst` has no default syntax, so the Dockerfile default IS the default). `EXPOSE 80`.
- No `USER` change: the official nginx entrypoint needs root to render templates and bind, and drops privileges for workers itself.

**Runtime configuration:** exactly two env vars — `API_ORIGIN` (required; scheme + host, no trailing slash, no path — e.g. `https://<app>.onrender.com`) and `PORT` (defaulted).

## 5. nginx config (`docker/nginx.conf.template`)

One `server` block, `listen ${PORT}`, `root /usr/share/nginx/html`:

- **`location /api/ { proxy_pass ${API_ORIGIN}; … }`** — after `envsubst` this is a *literal* URL (no nginx variable), so no `resolver` directive is needed and the full original URI is passed upstream. **No path rewriting anywhere** — the refresh cookie's `Path=/api/v1/accounts/` must match the URL the browser requested. `Set-Cookie` passes through untouched; the cookie is host-only, so it binds to the *frontend's* domain — exactly the dev-proxy behavior.
  - `proxy_ssl_server_name on;` — Render routes by SNI/Host; without it, TLS to `onrender.com` fails.
  - Do **not** override the `Host` header: nginx's default (`$proxy_host`) sends the backend's own hostname, which is what Render's router and the backend's `ALLOWED_HOSTS` expect. (This is why the backend needs zero changes.)
  - `proxy_read_timeout 90s;` — absorbs Render free-tier cold starts.
  - `proxy_http_version 1.1;` with `proxy_set_header Connection "";` (keep-alive to upstream).
- **`location / { try_files $uri /index.html; }`** — SPA fallback so React Router deep links survive reload.
- **`location /assets/ { … }`** — Vite's content-hashed bundles: `Cache-Control: public, max-age=31536000, immutable`.
- **`index.html`**: `Cache-Control: no-cache` (deploys become visible immediately).
- **`location = /healthz { return 200 "ok"; }`** with `Content-Type: text/plain` — Render health check; served by nginx itself (a backend cold start must not fail the frontend's health check).
- `gzip on` for text/js/css/svg/json.
- Security headers on app responses: `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`. (No CSP in this slice — the app inlines nothing exotic, but writing a correct CSP is its own task; noted out of scope.)

## 6. Local parity harness (`docker-compose.yml` + `.env.docker.example`)

```yaml
services:
  web:
    build: .
    env_file: .env.docker
    ports:
      - "8080:80"
```

`.env.docker.example` documents the two modes:
- `API_ORIGIN=https://<app>.onrender.com` — the image against the live Render API (primary verification mode).
- `API_ORIGIN=http://host.docker.internal:8000` — against a local `runserver` (Docker Desktop resolves `host.docker.internal` to the Windows host).

Cookie note for local runs: the backend's production cookie is `Secure`, and browsers treat `http://localhost` as a trustworthy origin, so Secure cookies still work on `http://localhost:8080`.

## 7. Verification (Definition of Done)

1. `docker build .` succeeds; final image contains no Node toolchain (stage-2-only).
2. `docker compose up --build` with `API_ORIGIN` pointed at the live Render API:
   - App loads at `http://localhost:8080`; public browse shows real data.
   - **Log in, then reload the page: the session survives** (the refresh cookie round-trips through the proxy — this is the single most load-bearing check).
   - Deep-link reload (e.g. `/jobs/<id>` or `/company/dashboard`) serves the app, not a 404.
   - Log out; session gone after reload.
   - `curl http://localhost:8080/healthz` → 200 `ok`.
   - Response headers: `/assets/*` immutable; `index.html` no-cache.
3. Repo hygiene: `npm run test` + `npm run typecheck` untouched and green (no source changes); `.env.docker` git-ignored.
4. PR from the feature branch into `staging` (required `ci` check; no merges by Claude).

## 8. Render runbook (`DEPLOYMENT.md` content outline)

Mirrors the backend's doc: (1) build + verify locally via the compose harness; (2) tag and push the image to a registry (user-owned step); (3) Render **Web Service → Existing image**: health check path `/healthz`, `PORT` injected automatically, set `API_ORIGIN=https://<backend>.onrender.com`; (4) note that the backend needs **no** new env (`CORS` never applies — the browser sees one origin; the proxy's `Host` header already matches the backend's `ALLOWED_HOSTS`); (5) **future upgrade path**: with a custom domain, move to `app.example.com` + `api.example.com` (same-site subdomains) and the proxy becomes optional — nothing in this design blocks that.

## 9. Out of scope / accepted limitations

- **CSP header** — deliberate follow-up, not this slice.
- **CDN/static-host deployment** (Vercel/Netlify) — ruled out with the user; cookie model would need the subdomain pattern.
- **Full-stack compose** (frontend + backend + Postgres in one file) — unnecessary for the separated-servers scenario; the backend repo already has its own parity compose.
- **Render Blueprint/IaC** — manual dashboard setup documented instead, matching the backend's runbook.
- **Rate-limiting/WAF at the proxy** — the backend already throttles; nginx adds none.
- Render free-tier cold starts still yield a slow first request (~30-60s); the proxy's 90s read timeout prevents 504s but cannot make cold starts fast.
