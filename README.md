# Workframe — Web Frontend

The frontend for **Workframe**, a two-sided job board. Talks to the Django "Job Board API"
(separate repo, default `http://localhost:8000/api/v1`).

## Stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS** + **shadcn/ui** conventions (so [21st.dev](https://21st.dev) / Magic MCP components drop in)
- **Framer Motion** for animation · **TanStack Query** for data
- Design language: **"Bold Editorial"** (light + dark)

## Getting started

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL if your API isn't on localhost:8000
npm run dev            # http://localhost:5173
```

Other scripts: `npm run build`, `npm run typecheck`, `npm run preview`.

> The API client gracefully falls back to seed content when the backend is unreachable,
> so the landing page renders even with the API offline. In dev the backend allows all
> CORS origins (Django `DEBUG=True`).

## Structure

```
src/
  components/ui         shadcn-style primitives (button, input, badge, card)
  components/layout     site header + footer
  components/landing    hero, category grid, featured jobs, value props, employer CTA
  components/theme      light/dark theme provider + toggle
  components/motion     scroll-reveal helper
  lib/api               typed client + public endpoints + types
  lib/{format,seed}     formatting helpers + offline fallback data
  pages/landing.tsx     the landing page
```

## Status

Landing page is built. Remaining screens (auth, job-seeker, company console) follow the
blueprint in `docs/superpowers/specs/` — the clickable design prototype lives at
[`docs/prototype/`](docs/prototype/) (open `index.html`) and is the visual reference.
