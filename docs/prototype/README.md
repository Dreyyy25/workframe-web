# Workframe — Clickable Prototype

A static, fully clickable HTML/CSS/JS prototype of the **Workframe** two-sided job board (job seekers + companies). This is a **design/UX prototype**, not the production frontend — there is no build step, no framework, and no backend.

Visual style: **Bold Editorial** (oversized Plus Jakarta Sans headings, Inter body, crisp 2px lines, sharp corners, a single electric-blue accent, signature hard-offset shadow) with full **light + dark** mode.

## How to open

Either:

- **Double-click `index.html`** — it works directly from the filesystem (`file://`), no server needed; or
- Serve the folder (nicer URLs):
  ```bash
  cd docs/prototype
  python -m http.server 8080
  # then open http://localhost:8080/
  ```

Toggle **light/dark** with the sun/moon button in the header (remembered via `localStorage`).

## Walk-throughs

The prototype starts logged-out. Two demo shortcuts on the **Log in** page jump you into either side:

- **Continue as demo Seeker** → seeker experience
- **Continue as demo Company** → company console

**Job-seeker flow:** Landing → **Find Jobs** (search + filter + paginate) → a job → **Apply now** (cover-letter modal) → **My Applications** (filter, withdraw) → application detail. Profile lives under the avatar menu, with tabs for Overview / Education / Experience / Skills (add & remove items).

**Company flow:** **For Employers** / Register (Company) → **Company console**: Dashboard (stats + recent applicants) → **Post a Job** (create or edit, with a skills builder) → **Job Posts** (publish/close) → **Applicants** (accept/reject) → applicant detail. Plus Company Profile (with image gallery) and Account Settings.

## Screens (~22)

- **Public:** Landing, Browse Jobs, Job Detail, Browse Companies, Company Public Profile, For Employers, 404
- **Auth:** Log in, Register (role toggle)
- **Seeker:** Dashboard, My Applications, Application Detail, Profile (tabbed)
- **Company:** Dashboard, Job Posts, Post/Edit Job, Applicants, Applicant Detail, Company Profile
- **Shared:** Account Settings, global theme toggle

## How it's built

```
index.html, jobs.html, job-detail.html, …      # one HTML file per screen
seeker/  company/  account/                     # role areas
assets/css/styles.css                           # design tokens + components (light + dark)
assets/js/data.js                               # mock data (mirrors the backend's enums/shapes)
assets/js/app.js                                # shared nav/sidebar/footer, theme, tabs, modals, toasts, apply flow
```

Each page declares its context with `data-shell` / `data-auth` / `data-active` body attributes; `app.js` renders the correct chrome and active state from those (no copy-pasted headers).

## Limitations (by design)

- **No backend.** All data is mocked in `data.js`.
- **Session-only state.** Applying to a job, changing an application/applicant status, adding profile items, etc. update **in-memory** state and **reset on page reload**. This is expected for a prototype.
- No real authentication, validation is illustrative, and "uploads" (résumé / company images) are faked URL fields.

The full design spec and implementation plan live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.
