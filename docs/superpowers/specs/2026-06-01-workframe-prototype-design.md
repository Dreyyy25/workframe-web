# Workframe — Clickable Prototype Design Spec

**Date:** 2026-06-01
**Status:** Draft for approval
**Author:** Design session (brainstorming)

---

## 1. Overview

Workframe is a two-sided job board. This document specifies a **static, fully clickable HTML/CSS/JS prototype** of its frontend — not the production app. The goal is to validate the look, feel, information architecture, and end-to-end navigation of every screen before any real frontend (framework, API integration) is built.

- **Repo:** `workframe-web` (this repo, the frontend). Backend is a separate Django/DRF "Job Board API" at `C:\Users\almos\Projects\Job-Board-API-only`.
- **Location:** the prototype lives under `docs/prototype/`.
- **Stack:** plain HTML + CSS + vanilla JS. No build step, no framework, no package manager.
- **Fidelity:** real visual design + real navigation between screens. Data is mocked (in-memory, session only). No network calls.

### Non-goals (out of scope)
- Real API calls, real authentication, or persistence beyond the current browser session.
- Password reset / email verification (the backend has no such endpoints).
- Notifications, payments, real file uploads (résumé / company images are URL fields with a faked upload UI).
- Production performance, SEO, or framework architecture.
- Pixel-perfection. Responsiveness **is** in scope; pixel-chasing is not.

---

## 2. Design System — "Bold Editorial"

Chosen direction: **Bold Editorial** with full **light and dark** support, toggled by the user and remembered in `localStorage`.

**Character:** oversized headlines, crisp 2px lines, sharp corners, generous whitespace, a single electric-blue accent, and a signature **hard-offset shadow** on key buttons/cards. No gradients, no soft drop-shadows.

### 2.1 Color tokens

Defined as CSS custom properties on `:root` (light) and `[data-theme="dark"]` (dark).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#0A0A0B` | Page background |
| `--surface` | `#FFFFFF` | `#121214` | Cards, panels |
| `--surface-2` | `#F5F5F5` | `#18181B` | Subtle fills, hover rows |
| `--ink` | `#0A0A0A` | `#FAFAFA` | Primary text + strong borders |
| `--muted` | `#565656` | `#A1A1AA` | Secondary text |
| `--line` | `#0A0A0A` | `#E4E4E7` | Strong borders (2px) |
| `--line-soft` | `#E5E5E5` | `rgba(255,255,255,.10)` | Subtle dividers |
| `--accent` | `#2563EB` | `#3B82F6` | Links, primary CTA, active state, hero accent |
| `--accent-ink` | `#FFFFFF` | `#FFFFFF` | Text on accent |
| `--success` | `#15803D` | `#22C55E` | Accepted / positive |
| `--warning` | `#B45309` | `#F59E0B` | Pending / caution |
| `--error` | `#DC2626` | `#F87171` | Rejected / destructive |
| `--focus` | `#2563EB` | `#3B82F6` | Focus ring |

### 2.2 Typography
- **Display & headings:** `Plus Jakarta Sans`, weights 700/800, tracking `-0.02em` to `-0.03em`.
- **Body & UI:** `Inter`, weights 400/500/600.
- Loaded via Google Fonts `@import` with `display=swap`.
- **Scale (px):** 12, 14, 16 (body base), 18, 24, 32, 48; hero uses `clamp(2rem, 6vw, 4rem)`.
- Body line-height 1.5; headings 1.05–1.15.

### 2.3 Shape, border, motion
- **Radii:** `--r: 4px` (cards, buttons, inputs), `--r-sm: 3px` (chips, pills/badges). Sharp, editorial.
- **Borders:** 2px solid `--line` on cards, inputs, and outline buttons; 1px–1.5px on small chips.
- **Signature shadow:** `box-shadow: 3px 3px 0 var(--line)` on primary buttons & elevated cards; on hover, grow to `5px 5px 0` and translate `-1px,-1px`. Hard, offset, no blur.
- **Transitions:** 150–200ms `ease`. Animate `transform`, `opacity`, `box-shadow`, `color` only.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` disables translate/shadow-grow and shortens transitions.

### 2.4 Component inventory (in `styles.css`)
Buttons (primary/secondary/ghost/destructive), inputs/select/textarea + labels + helper/error text, job card, company card, stat card (dashboard), status badge (color **and** icon/text — never color alone), tag/chip, tabs, avatar, top nav, footer, sidebar + sidebar nav item, modal + scrim (40–60% black), empty state, pagination, filter panel, applicants table (sortable look), toast, breadcrumb.

### 2.5 Accessibility baseline
- Contrast ≥ 4.5:1 for text in both themes; accent reserved for large text / UI / buttons (white on accent meets the bar).
- Visible focus rings; logical tab order; full keyboard operation of nav, tabs, dropdowns, modals (Esc closes).
- All inputs have real `<label>`s; required fields marked; errors shown beside the field.
- Status conveyed by icon + text, not color alone.
- Semantic landmarks (`header`, `nav`, `main`, `footer`); icon-only buttons get `aria-label`; SVG icons only (no emoji).

---

## 3. Information Architecture (~22 screens)

Two UI shells:
- **Marketing/app shell** — top nav + footer. Used by Public pages and the Job-Seeker area.
- **Company console shell** — left sidebar + slim topbar. Used by the Company area.

### 3.1 Public (marketing shell)
1. **Landing / Home** — hero with search bar (the primary CTA), featured/recent jobs, category tiles (business streams), dual value-prop (for seekers / for companies), footer.
2. **Browse Jobs** — keyword search + filters (city/country, salary range, job type, skills), sort (newest, salary), client-side filtering of the mock list, pagination, job cards.
3. **Job Detail** — title, company (links to public profile), location, type, salary, deadline, required skills, full description, Apply CTA (logged-out → prompt to log in).
4. **Browse Companies** — directory grid filterable by business stream + search.
5. **Company Public Profile** — logo/images, description, website, business stream, list of that company's open roles.
6. **For Employers** — marketing page targeting companies; CTA to register/post a job.
7. **404 Not Found** — on-brand empty/error screen with links home.

### 3.2 Auth (centered, minimal layout)
8. **Log in** — email + password, link to register, demo-login shortcuts (seeker / company) for easy prototype walkthrough.
9. **Register** — role toggle **Job Seeker / Company** at top; fields adapt to role (seeker: name, email, password; company: company name, email, password, business stream). Submitting routes to the matching dashboard.

### 3.3 Job Seeker (marketing/app shell + avatar menu)
10. **Seeker Dashboard** — stat cards (applications by status), recommended/recent jobs, profile-completeness nudge, quick links.
11. **My Applications** — list with status badges (pending → reviewed → accepted/rejected/withdrawn), filter by status, link to job, **Withdraw** action.
12. **Application Detail** — the job summary, submitted cover letter, status timeline.
13. **Seeker Profile** — single page with **tabs**: **Overview** (name, contact, goals, résumé URL, photo), **Education** (list + add/edit/delete), **Experience** (list + add/edit/delete), **Skills** (skill + proficiency: Beginner/Intermediate/Advanced/Expert).
14. **Apply to Job** — modal launched from Job Detail; cover-letter textarea → success state → appears in My Applications.

### 3.4 Company (console shell)
15. **Company Dashboard** — stat cards (active posts, total applicants, new this week), recent applications table, quick action "Post a Job".
16. **Manage Job Posts** — table/list of the company's posts with applicant counts; publish/close toggle; edit/delete.
17. **Post / Edit Job** — form: title, description, job type, location (city/country/etc.), salary min/max + type (hourly/monthly/yearly), deadline, required skills with level + required/optional. Same screen for create and edit.
18. **Job Applicants** — per-post applicant list with status; quick accept/reject/review; link to applicant detail.
19. **Applicant Detail** — applicant's profile (education/experience/skills), submitted cover letter, change status.
20. **Company Profile** — company name, business stream, website, contact email, description, status; **image gallery** with faked upload/manage.

### 3.5 Shared (both roles)
21. **Account Settings** — email, contact number, date of birth, sex, profile photo (URL/faked upload), change password. Maps to `/accounts/me/`.
22. **Theme Toggle** — global control in both shells; light/dark; persisted.

### 3.6 Key flows
- **Seeker:** Landing → Browse Jobs → Job Detail → (Log in) → Apply (modal) → My Applications → Application Detail.
- **Company:** Register (Company) → Company Dashboard → Post a Job → Manage Job Posts → Job Applicants → Applicant Detail (accept/reject).

---

## 4. Technical Architecture

### 4.1 File structure
```
docs/prototype/
  index.html              # Landing
  jobs.html               # Browse jobs
  job-detail.html         # Job detail (reads ?id= from query)
  companies.html          # Browse companies
  company-public.html     # Public company profile (?id=)
  for-employers.html
  login.html
  register.html
  404.html
  seeker/
    dashboard.html
    applications.html
    application-detail.html # (?id=)
    profile.html            # tabs: overview/education/experience/skills
  company/
    dashboard.html
    jobs.html               # manage posts
    post-job.html           # create + edit (?id= to edit)
    applicants.html         # (?job= )
    applicant-detail.html   # (?id=)
    profile.html
  account/
    settings.html
  assets/
    css/styles.css          # tokens + components, light + dark
    js/data.js              # mock data + enums
    js/app.js               # shared chrome, theme, nav, tabs, modals, interactions
    icons/                  # inline-SVG sprite or individual SVGs (Lucide-style)
```

### 4.2 Shared chrome (no copy-paste)
Each page contains a small set of placeholder elements (e.g. `<div data-shell="top">`, `<div data-shell="sidebar">`, `<div data-shell="footer">`) and a `<body>` attribute declaring its context: `data-shell="marketing"` or `data-shell="console"`, plus `data-auth="guest|seeker|company"` and `data-active="jobs"` (for active nav state). `app.js` reads these and renders the correct nav/sidebar/footer + highlights the active link. This keeps navigation DRY and works on `file://` (DOM-built, **no `fetch`**).

### 4.3 Theme toggle
`app.js` reads `localStorage.theme` (fallback to `prefers-color-scheme`), sets `data-theme` on `<html>`, and a toggle button flips and persists it. An inline head snippet applies the saved theme before paint to avoid flash.

### 4.4 Mock data (`data.js`)
Plain JS objects/arrays exposed on a global (e.g. `window.WF`). Shapes mirror the backend so a later real frontend maps cleanly. Uses the backend's real enums:
- **User types:** `job_seeker`, `company`. **Application status:** pending, reviewed, accepted, rejected, withdrawn. **Salary type:** hourly, monthly, yearly. **Skill level:** Beginner, Intermediate, Advanced, Expert. **Degree types:** High School, Associate, Bachelor, Master, PhD, Certificate, Diploma. **Company status:** active, inactive, suspended.
- **Entities:** jobs (title, description, company, jobType, location{city,country,...}, salaryMin/Max/Type, deadline, skills[]), companies (name, businessStream, website, description, images[], status), seekerProfile (name, contact, goals, resumeUrl, photo, education[], experience[], skills[]), applications (job, status, appliedDate, coverLetter).
- Seed: ~12–18 jobs across ~6 companies, ~8 business streams, a sample seeker, and a few applications. Realistic copy (no lorem-only).

### 4.5 Interactivity (what actually works)
- Real `<a href>` navigation across all pages.
- Theme switch (persisted).
- Job **search/filter/sort** on the mock list (client-side), pagination.
- Profile/console **tabs**, dropdown menus, **modals** (Apply), toasts.
- **Apply** → adds to in-memory applications → shows in My Applications.
- Application **status changes** (seeker withdraw; company accept/reject/review) update in-memory state for the session (reset on reload — acceptable for a prototype).
- "Demo login" buttons set `data-auth` context so reviewers can walk both sides without a backend.

### 4.6 Responsiveness
Mobile-first. Breakpoints 375 / 768 / 1024 / 1440. The company sidebar collapses into a top bar + slide-in drawer below 1024px. No horizontal scroll; `min-h-dvh` patterns; touch targets ≥ 44px.

---

## 5. Build order (high level)
1. **Foundation:** `styles.css` tokens + base + core components; `app.js` shell renderer + theme; `data.js` seed. Build the Landing page to exercise the system.
2. **Public:** Browse Jobs, Job Detail, Companies, Company Public Profile, For Employers, 404.
3. **Auth:** Login, Register (role toggle).
4. **Seeker:** Dashboard, Profile (tabs), My Applications, Application Detail, Apply modal.
5. **Company:** console shell, Dashboard, Manage Posts, Post/Edit Job, Applicants, Applicant Detail, Company Profile.
6. **Shared + polish:** Account Settings, cross-screen QA (light/dark, responsive, keyboard), reduced-motion pass.

(Detailed, ordered tasks are produced by the implementation plan in the next step.)

---

## 6. Acceptance criteria
- All ~22 screens exist and are reachable purely by clicking, opening from `docs/prototype/index.html` with no server.
- Light/dark toggle works on every page and is remembered.
- Both end-to-end flows (Seeker apply; Company post→review) are walkable with the demo-login shortcuts.
- Consistent Bold Editorial styling across every screen in both themes.
- No emoji-as-icons; visible focus states; labelled inputs; status shown by icon+text.
- Renders without breakage at 375px and 1440px.
