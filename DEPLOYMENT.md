# Deploying workframe-web (Docker → Render)

The repo ships a production Docker image. You build and push it to a registry;
Render runs it as a web service from that image. Nothing in this repo pushes
images or talks to Render.

## 1. What this image is

nginx serves the built SPA (`node:24-alpine` build stage → `nginx:1.30.4-alpine`
runtime) and reverse-proxies `/api/*` to `API_ORIGIN` with no path rewriting.
Same-origin is required because the backend's refresh cookie is httpOnly,
`SameSite=Lax`, and path-scoped to `/api/v1/accounts/` — a browser loading the
app from one domain and calling the API on another treats that as cross-site
and drops the cookie, breaking login on reload. Routing both through one nginx
origin is exactly what the Vite dev proxy already does, carried into
production. Design reference:
[`docs/superpowers/specs/2026-08-11-frontend-docker-deploy-design.md`](docs/superpowers/specs/2026-08-11-frontend-docker-deploy-design.md).

## 2. Build and verify locally

    cp .env.docker.example .env.docker   # set API_ORIGIN
    docker compose up --build            # http://localhost:8080

`.env.docker` supports two `API_ORIGIN` modes, either is a valid local verify:

- `https://<app>.onrender.com` — against the live Render API (primary mode).
- `http://host.docker.internal:8000` — against a local `runserver` (Docker
  Desktop resolves the hostname to the Windows host).

If `API_ORIGIN` points at the live Render API and the backend has spun down
(free tier), the first request can take ~30-60s — nginx's 90s
`proxy_read_timeout` absorbs it, so expect a slow first load, not an error.

Checklist:

1. App loads at `http://localhost:8080`; public browse shows real data.
2. **Log in, then reload: the session survives** — the refresh cookie
   round-trips through the proxy. Single most load-bearing check.
3. Deep-link reload (e.g. `/jobs/<id>`, `/company/dashboard`) serves the app,
   not a 404.
4. Log out; session gone after reload.
5. `curl http://localhost:8080/healthz` → 200 `ok`.
6. Response headers: `/assets/*` immutable; `index.html` no-cache.

Local `http://localhost` is treated as a trustworthy origin by browsers, so
the backend's `Secure` cookie still round-trips on `http://localhost:8080` —
no extra flag needed to verify locally.

## 3. Build and push to Docker Hub (user-owned)

Log in once with your **Docker Hub** account (its username may differ from
your GitHub username):

    docker login

Build and push — Docker Hub needs no registry prefix (`docker.io` is the
default), so the image name is just `<dockerhub-username>/workframe-web:<tag>`:

    docker build -t <dockerhub-username>/workframe-web:v1 .
    docker push <dockerhub-username>/workframe-web:v1

- The Hub repository is created automatically on first push — no dashboard
  step needed. It defaults to **public**; switch it to private on
  hub.docker.com if you prefer (the free tier includes one private repo).
- Use an explicit version tag (`v1`, `v2`, …) per release rather than
  `latest` — Render redeploys pull whatever the named tag points at, and
  explicit tags make rollbacks a one-line change.
- Build from a clean checkout of the release branch so the image matches a
  released state.

In section 4, reference the image on Render as
`<dockerhub-username>/workframe-web:<tag>` (or the fully-qualified
`docker.io/<dockerhub-username>/workframe-web:<tag>` — same thing).

## 4. Render web service

Create a **Web Service → Existing image** pointing at the pushed image.

- **Health check path:** `/healthz`
- **Port:** Render injects `PORT` automatically; the image default (`80`) is
  local-only and never used on Render.

### Environment variables

| Variable | Value |
|---|---|
| `API_ORIGIN` | `https://<backend>.onrender.com` — scheme + host, no trailing slash, no path |

That's it — `PORT` is injected by Render, not set here.

**The backend needs no new env — it never needs to know this frontend's
URL.** `CORS` never applies because the browser only ever sees one origin
(the frontend's); the proxy doesn't override the `Host` header, so it
forwards the backend's own hostname, which already matches the backend's
`ALLOWED_HOSTS`. Backend env is documented in one place only: the backend
repo's own `DEPLOYMENT.md` (which says to leave `CORS_ALLOWED_ORIGINS`
unset for exactly this reason).

Free-tier cold starts: the first request after the backend has spun down
takes roughly 30-60s. The proxy's `proxy_read_timeout 90s` absorbs that
instead of surfacing a 504 — expect a slow first load, not an error.

## 5. Future: custom domain

With `app.example.com` (frontend) and `api.example.com` (backend) as
same-site subdomains, the cookie stays valid across them without a proxy —
the reverse-proxy step becomes optional. Nothing in this setup blocks that
move; it's a DNS + Render custom-domain change, not a rebuild.
