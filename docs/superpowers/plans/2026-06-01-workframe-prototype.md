# Workframe Clickable Prototype — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, fully clickable HTML/CSS/JS prototype of the Workframe two-sided job board (~22 screens), in the "Bold Editorial" style with light/dark themes, under `docs/prototype/`.

**Architecture:** Multi-page static site. Each screen is its own `.html` file linked by real `<a href>` (works on `file://`, no server). One `styles.css` holds all design tokens + components for light & dark. One `app.js` renders shared chrome (top nav / sidebar / footer) from `data-*` body attributes, manages theme, tabs, dropdowns, modals, toasts, and in-memory state. One `data.js` holds realistic mock data mirroring the backend's enums. No framework, no build step, no `fetch` (so it runs from the filesystem).

**Tech Stack:** HTML5, CSS (custom properties, fl/grid), vanilla ES5/ES6 JS (plain `<script>`, no modules), Google Fonts (Plus Jakarta Sans + Inter), inline SVG icons (Lucide-style). Spec: `docs/superpowers/specs/2026-06-01-workframe-prototype-design.md`.

---

## Conventions (used by every task — keep names exact)

**Body attributes** (drive `app.js` shell rendering):
- `data-shell="marketing" | "console" | "auth"`
- `data-auth="guest" | "seeker" | "company"`
- `data-active="<navKey>"` — one of: `jobs`, `companies`, `employers`, `dashboard`, `applications`, `profile`, `posts`, `post-job`, `applicants`, `company-profile`, `settings`, `""`.

**Shared chrome placeholders** in `<body>`: `<a class="skip-link" href="#main">Skip to content</a>`, `<div id="shell-top"></div>`, `<div id="shell-side"></div>`, `<main id="main">…page content…</main>`, `<div id="shell-foot"></div>`, `<div id="toast-root" aria-live="polite"></div>`, `<div id="modal-root"></div>`.

**CSS class names (canonical):** `.container`, `.section`, `.hero`, `.btn` + modifiers `.btn--primary .btn--secondary .btn--ghost .btn--danger .btn--sm .btn--block`, `.field .field__label .field__hint .field__error .input .select .textarea`, `.card`, `.job-card`, `.company-card`, `.stat-card`, `.badge` + `.badge--pending .badge--reviewed .badge--accepted .badge--rejected .badge--withdrawn`, `.chip`, `.tabs .tab .tab--active .tabpanel`, `.modal .modal__scrim .modal__panel`, `.table`, `.topnav .topnav__links .topnav__cta`, `.sidebar .sidebar__link .sidebar__link--active`, `.footer`, `.empty`, `.pagination .page-btn`, `.toast`, `.filters`, `.avatar`, `.breadcrumb`, `.dropdown .dropdown__menu`, `.skip-link`, `.theme-toggle`, `.stack` `.cluster` `.grid` (layout helpers).

**JS globals:** `window.WF` (data) and `window.WFApp` (behavior). Functions referenced across tasks: `WFApp.initTheme()`, `WFApp.toggleTheme()`, `WFApp.renderShell()`, `WFApp.qs(name)` (read URL query param), `WFApp.toast(msg, kind)`, `WFApp.openModal(html)`, `WFApp.closeModal()`, `WFApp.initTabs(root)`, `WFApp.state` (session app state: `applications`), `WFApp.icon(name)` (returns inline SVG string), `WFApp.money(min,max,type)`, `WFApp.timeAgo(date)`, `WFApp.escapeHtml(s)`.

**Z-index scale (CSS vars):** `--z-base:1; --z-dropdown:20; --z-sticky:30; --z-modal:50; --z-toast:60;` — never use arbitrary values.

**Verification convention:** Each screen task is verified by opening it in a browser. Either double-click the file (works via `file://`) or, for the whole site, run `python -m http.server 8080` inside `docs/prototype/` and visit `http://localhost:8080/...`. "Verify" steps list exactly what to look for. Commit after each task with a `prototype:` prefixed message.

**Design-quality guardrails (apply to EVERY screen — anti-AI-slop):**
- SVG icons only via `WFApp.icon()` — never emoji.
- Real, specific copy from `data.js` — never "Lorem ipsum" or "Card 1 / Card 2".
- Asymmetric, intentional layouts — avoid the default "centered hero + three identical cards" cliché; use the editorial grid, oversized headings (clamp), and generous whitespace.
- Every interactive element: `cursor:pointer`, a visible `:hover` change, and a visible `:focus-visible` ring.
- One primary CTA per screen; secondary actions visually subordinate.
- Sequential headings (single `<h1>` per page).
- Both themes verified; 375px and 1440px verified.

---

## File Structure
```
docs/prototype/
  index.html  jobs.html  job-detail.html  companies.html  company-public.html
  for-employers.html  login.html  register.html  404.html  README.md
  seeker/   dashboard.html  applications.html  application-detail.html  profile.html
  company/  dashboard.html  jobs.html  post-job.html  applicants.html  applicant-detail.html  profile.html
  account/  settings.html
  assets/css/styles.css
  assets/js/data.js
  assets/js/app.js
```

---

## Task 1: Scaffolding + shared `<head>` pattern + base HTML

**Files:**
- Create: `docs/prototype/assets/css/styles.css` (empty placeholder, filled in Tasks 2–3)
- Create: `docs/prototype/assets/js/data.js` (empty placeholder, filled in Task 4)
- Create: `docs/prototype/assets/js/app.js` (empty placeholder, filled in Task 5)
- Create: `docs/prototype/index.html` (minimal shell, completed in Task 6)

- [ ] **Step 1: Create the folder structure and empty asset files.** Create the directories above and three empty files (`styles.css`, `data.js`, `app.js`).

- [ ] **Step 2: Establish the canonical `<head>` + body skeleton.** Every page uses this exact pattern (paths adjust with `../` for sub-folders). Write it into `index.html`:

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Workframe — Find work that works for you</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/css/styles.css" />
  <!-- Apply saved theme before paint to avoid flash -->
  <script>(function(){try{var t=localStorage.getItem('wf-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body data-shell="marketing" data-auth="guest" data-active="">
  <a class="skip-link" href="#main">Skip to content</a>
  <div id="shell-top"></div>
  <div id="shell-side"></div>
  <main id="main"><!-- page content --></main>
  <div id="shell-foot"></div>
  <div id="toast-root" aria-live="polite"></div>
  <div id="modal-root"></div>
  <script src="assets/js/data.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 3: Verify.** Open `docs/prototype/index.html` in a browser. Expected: blank page, no console errors, fonts requested in the Network tab. The `data-theme` attribute on `<html>` reflects light/dark.

- [ ] **Step 4: Commit.**
```bash
git add docs/prototype
git commit -m "prototype: scaffold folders, assets, and base HTML head pattern"
```

---

## Task 2: Design tokens, reset, typography, layout helpers (`styles.css` part 1)

**Files:**
- Modify: `docs/prototype/assets/css/styles.css`

- [ ] **Step 1: Write the token + base layer.** Append the complete code:

```css
/* ============ TOKENS ============ */
:root{
  --bg:#FFFFFF; --surface:#FFFFFF; --surface-2:#F5F5F5;
  --ink:#0A0A0A; --muted:#565656;
  --line:#0A0A0A; --line-soft:#E5E5E5;
  --accent:#2563EB; --accent-ink:#FFFFFF;
  --success:#15803D; --warning:#B45309; --error:#DC2626;
  --focus:#2563EB;
  --r:4px; --r-sm:3px;
  --shadow:3px 3px 0 var(--line);
  --shadow-lg:5px 5px 0 var(--line);
  --z-base:1; --z-dropdown:20; --z-sticky:30; --z-modal:50; --z-toast:60;
  --font-display:'Plus Jakarta Sans',system-ui,sans-serif;
  --font-body:'Inter',system-ui,sans-serif;
  --maxw:1200px; --nav-h:64px;
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px; --space-8:32px; --space-12:48px; --space-16:64px;
}
[data-theme="dark"]{
  --bg:#0A0A0B; --surface:#121214; --surface-2:#18181B;
  --ink:#FAFAFA; --muted:#A1A1AA;
  --line:#E4E4E7; --line-soft:rgba(255,255,255,.10);
  --accent:#3B82F6; --accent-ink:#FFFFFF;
  --success:#22C55E; --warning:#F59E0B; --error:#F87171;
  --focus:#3B82F6;
}
/* ============ RESET ============ */
*,*::before,*::after{box-sizing:border-box;}
html{-webkit-text-size-adjust:100%;}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-body);font-size:16px;line-height:1.5;min-height:100dvh;}
img{max-width:100%;display:block;}
a{color:var(--accent);text-decoration:none;}
a:hover{text-decoration:underline;}
button{font:inherit;cursor:pointer;}
:focus-visible{outline:3px solid var(--focus);outline-offset:2px;}
h1,h2,h3,h4{font-family:var(--font-display);font-weight:800;letter-spacing:-0.02em;line-height:1.1;margin:0 0 .4em;}
h1{font-size:clamp(2rem,5vw,3.25rem);letter-spacing:-0.03em;}
h2{font-size:clamp(1.5rem,3vw,2.25rem);}
h3{font-size:1.25rem;font-weight:700;}
p{margin:0 0 1rem;}
.muted{color:var(--muted);}
.skip-link{position:absolute;left:-999px;top:0;background:var(--ink);color:var(--bg);padding:10px 16px;z-index:var(--z-toast);}
.skip-link:focus{left:8px;top:8px;}
/* ============ LAYOUT HELPERS ============ */
.container{width:100%;max-width:var(--maxw);margin-inline:auto;padding-inline:clamp(16px,4vw,32px);}
.section{padding-block:clamp(40px,6vw,80px);}
.stack>*+*{margin-top:var(--space-4);}
.cluster{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;}
.grid{display:grid;gap:var(--space-6);}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;}}
```

- [ ] **Step 2: Verify.** Reload `index.html`; toggle `data-theme="dark"` on `<html>` via devtools. Expected: background and text colors invert correctly; focusing the page shows the skip link top-left.

- [ ] **Step 3: Commit.**
```bash
git add docs/prototype/assets/css/styles.css
git commit -m "prototype: add design tokens, reset, typography, layout helpers"
```

---

## Task 3: Component styles (`styles.css` part 2)

**Files:**
- Modify: `docs/prototype/assets/css/styles.css`

- [ ] **Step 1: Append the full component layer.** This is the visual identity — keep the hard-offset shadow and 2px borders (anti-slop signature):

```css
/* ============ BUTTONS ============ */
.btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-display);font-weight:700;font-size:14px;
  padding:10px 18px;border:2px solid var(--line);border-radius:var(--r);background:var(--surface);color:var(--ink);
  transition:transform .15s ease,box-shadow .15s ease,background .15s ease;text-decoration:none;}
.btn:hover{text-decoration:none;}
.btn--primary{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);box-shadow:var(--shadow);}
.btn--primary:hover{transform:translate(-1px,-1px);box-shadow:var(--shadow-lg);}
.btn--secondary{background:var(--ink);color:var(--bg);box-shadow:var(--shadow);}
.btn--secondary:hover{transform:translate(-1px,-1px);box-shadow:var(--shadow-lg);}
.btn--ghost{background:transparent;}
.btn--ghost:hover{background:var(--surface-2);}
.btn--danger{background:var(--error);color:#fff;border-color:var(--error);}
.btn--sm{padding:6px 12px;font-size:13px;}
.btn--block{width:100%;justify-content:center;}
.btn[disabled]{opacity:.45;cursor:not-allowed;box-shadow:none;transform:none;}
/* ============ FORMS ============ */
.field{display:block;margin-bottom:var(--space-4);}
.field__label{display:block;font-family:var(--font-display);font-weight:600;font-size:14px;margin-bottom:6px;}
.field__label .req{color:var(--error);}
.input,.select,.textarea{width:100%;border:2px solid var(--line);border-radius:var(--r);background:var(--surface);color:var(--ink);
  padding:11px 13px;font:inherit;font-size:15px;}
.input::placeholder,.textarea::placeholder{color:var(--muted);}
.input:focus,.select:focus,.textarea:focus{outline:3px solid var(--focus);outline-offset:1px;}
.textarea{min-height:120px;resize:vertical;}
.field__hint{font-size:13px;color:var(--muted);margin-top:6px;}
.field__error{font-size:13px;color:var(--error);margin-top:6px;display:flex;gap:6px;align-items:center;}
/* ============ CARDS ============ */
.card{background:var(--surface);border:2px solid var(--line);border-radius:var(--r);padding:var(--space-6);}
.job-card{background:var(--surface);border:2px solid var(--line);border-radius:var(--r);padding:var(--space-6);
  transition:transform .15s ease,box-shadow .15s ease;display:block;color:inherit;}
.job-card:hover{transform:translate(-2px,-2px);box-shadow:var(--shadow-lg);text-decoration:none;}
.job-card__title{font-family:var(--font-display);font-weight:700;font-size:18px;margin:0 0 2px;}
.job-card__meta{color:var(--muted);font-size:14px;}
.job-card__salary{font-family:var(--font-display);font-weight:800;color:var(--accent);}
.company-card{background:var(--surface);border:2px solid var(--line);border-radius:var(--r);padding:var(--space-6);transition:transform .15s ease,box-shadow .15s ease;}
.company-card:hover{transform:translate(-2px,-2px);box-shadow:var(--shadow-lg);}
.stat-card{background:var(--surface);border:2px solid var(--line);border-radius:var(--r);padding:var(--space-6);}
.stat-card__num{font-family:var(--font-display);font-weight:800;font-size:40px;line-height:1;}
.stat-card__label{color:var(--muted);font-size:14px;margin-top:4px;}
/* ============ BADGES / CHIPS ============ */
.badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:var(--r-sm);border:1.5px solid var(--line);}
.badge svg{width:13px;height:13px;}
.badge--pending{color:var(--warning);border-color:var(--warning);}
.badge--reviewed{color:var(--accent);border-color:var(--accent);}
.badge--accepted{color:var(--success);border-color:var(--success);}
.badge--rejected{color:var(--error);border-color:var(--error);}
.badge--withdrawn{color:var(--muted);border-color:var(--muted);}
.chip{display:inline-flex;align-items:center;font-size:12px;padding:3px 9px;border-radius:var(--r-sm);border:1.5px solid var(--line);background:transparent;}
.chip--clickable{cursor:pointer;}
.chip--clickable:hover{background:var(--surface-2);}
/* ============ TABS ============ */
.tabs{display:flex;gap:4px;border-bottom:2px solid var(--line);margin-bottom:var(--space-6);overflow-x:auto;}
.tab{font-family:var(--font-display);font-weight:600;font-size:15px;padding:10px 16px;border:none;background:none;color:var(--muted);border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap;}
.tab--active{color:var(--ink);border-bottom-color:var(--accent);}
.tabpanel[hidden]{display:none;}
/* ============ TABLE ============ */
.table{width:100%;border-collapse:collapse;border:2px solid var(--line);border-radius:var(--r);overflow:hidden;background:var(--surface);}
.table th,.table td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--line-soft);font-size:14px;}
.table th{font-family:var(--font-display);font-weight:700;background:var(--surface-2);}
.table tr:last-child td{border-bottom:none;}
.table tr:hover td{background:var(--surface-2);}
/* ============ TOPNAV ============ */
.topnav{position:sticky;top:0;z-index:var(--z-sticky);background:var(--bg);border-bottom:2px solid var(--line);}
.topnav__inner{display:flex;align-items:center;justify-content:space-between;height:var(--nav-h);gap:var(--space-6);}
.brand{font-family:var(--font-display);font-weight:800;letter-spacing:-0.01em;font-size:18px;display:flex;align-items:center;gap:8px;color:var(--ink);}
.brand__mark{width:18px;height:18px;border-radius:4px;background:var(--ink);}
.topnav__links{display:flex;gap:var(--space-6);align-items:center;}
.topnav__links a{color:var(--ink);font-weight:600;font-size:15px;}
.topnav__links a[aria-current="page"]{color:var(--accent);}
.topnav__right{display:flex;gap:var(--space-3);align-items:center;}
.theme-toggle{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:2px solid var(--line);border-radius:var(--r);background:var(--surface);}
.theme-toggle:hover{background:var(--surface-2);}
.theme-toggle svg{width:18px;height:18px;}
/* dropdown */
.dropdown{position:relative;}
.dropdown__menu{position:absolute;right:0;top:calc(100% + 8px);min-width:200px;background:var(--surface);border:2px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow);padding:6px;z-index:var(--z-dropdown);}
.dropdown__menu[hidden]{display:none;}
.dropdown__menu a,.dropdown__menu button{display:flex;width:100%;align-items:center;gap:10px;padding:9px 12px;border-radius:var(--r-sm);color:var(--ink);font-size:14px;font-weight:500;border:none;background:none;text-align:left;}
.dropdown__menu a:hover,.dropdown__menu button:hover{background:var(--surface-2);text-decoration:none;}
.avatar{width:40px;height:40px;border-radius:var(--r);border:2px solid var(--line);background:var(--surface-2);display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;}
/* hamburger (mobile) */
.nav-toggle{display:none;}
/* ============ SIDEBAR (console) ============ */
.app-console{display:grid;grid-template-columns:248px 1fr;min-height:100dvh;}
.sidebar{border-right:2px solid var(--line);background:var(--surface);padding:var(--space-6) var(--space-4);position:sticky;top:0;height:100dvh;}
.sidebar .brand{margin-bottom:var(--space-8);}
.sidebar__link{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:var(--r);color:var(--ink);font-weight:600;font-size:15px;margin-bottom:4px;border:2px solid transparent;}
.sidebar__link svg{width:18px;height:18px;}
.sidebar__link:hover{background:var(--surface-2);text-decoration:none;}
.sidebar__link--active{border-color:var(--line);box-shadow:var(--shadow);}
.console-topbar{height:var(--nav-h);border-bottom:2px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding-inline:var(--space-6);position:sticky;top:0;background:var(--bg);z-index:var(--z-sticky);}
.console-main{padding:var(--space-8) var(--space-8);}
/* ============ FOOTER ============ */
.footer{border-top:2px solid var(--line);background:var(--surface);margin-top:var(--space-16);}
.footer__inner{display:flex;flex-wrap:wrap;gap:var(--space-8);justify-content:space-between;padding-block:var(--space-12);}
.footer a{color:var(--muted);display:block;margin-bottom:8px;font-size:14px;}
/* ============ HERO ============ */
.hero{padding-block:clamp(48px,8vw,96px);}
.hero h1 .accent{color:var(--accent);}
.searchbar{display:flex;gap:8px;max-width:640px;margin-top:var(--space-6);}
.searchbar .input{flex:1;}
/* ============ MODAL ============ */
.modal__scrim{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:var(--z-modal);display:flex;align-items:center;justify-content:center;padding:16px;}
.modal__panel{background:var(--surface);border:2px solid var(--line);border-radius:var(--r);box-shadow:var(--shadow-lg);max-width:560px;width:100%;padding:var(--space-8);max-height:90dvh;overflow:auto;}
.modal__panel h2{margin-top:0;}
/* ============ TOAST ============ */
#toast-root{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:var(--z-toast);display:flex;flex-direction:column;gap:8px;align-items:center;}
.toast{background:var(--ink);color:var(--bg);border-radius:var(--r);padding:12px 18px;font-weight:600;font-size:14px;box-shadow:var(--shadow);display:flex;gap:8px;align-items:center;}
/* ============ MISC ============ */
.empty{text-align:center;padding:var(--space-16) var(--space-6);border:2px dashed var(--line);border-radius:var(--r);}
.empty svg{width:40px;height:40px;margin-bottom:12px;}
.pagination{display:flex;gap:6px;justify-content:center;margin-top:var(--space-8);}
.page-btn{min-width:40px;height:40px;border:2px solid var(--line);border-radius:var(--r);background:var(--surface);font-weight:700;display:inline-flex;align-items:center;justify-content:center;}
.page-btn[aria-current="true"]{background:var(--ink);color:var(--bg);}
.filters{border:2px solid var(--line);border-radius:var(--r);padding:var(--space-6);background:var(--surface);}
.breadcrumb{display:flex;gap:8px;align-items:center;color:var(--muted);font-size:14px;margin-bottom:var(--space-6);}
.breadcrumb a{color:var(--muted);}
.section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:var(--space-6);flex-wrap:wrap;}
/* ============ RESPONSIVE ============ */
@media(max-width:1024px){
  .app-console{grid-template-columns:1fr;}
  .sidebar{position:fixed;left:0;top:0;width:248px;transform:translateX(-100%);transition:transform .2s ease;z-index:var(--z-modal);}
  .sidebar.open{transform:none;}
}
@media(max-width:768px){
  .topnav__links{display:none;}
  .nav-toggle{display:inline-flex;}
  .topnav__links.open{display:flex;position:absolute;top:var(--nav-h);left:0;right:0;flex-direction:column;background:var(--bg);border-bottom:2px solid var(--line);padding:var(--space-4);}
  .searchbar{flex-direction:column;}
  .console-main{padding:var(--space-6) var(--space-4);}
}
```

- [ ] **Step 2: Verify.** No test page yet — open `index.html`, paste a `<button class="btn btn--primary">Test</button>` into `#main` via devtools. Expect: blue button, hard-offset shadow, lifts on hover, focus ring on Tab.

- [ ] **Step 3: Commit.**
```bash
git add docs/prototype/assets/css/styles.css
git commit -m "prototype: add full component style layer (buttons, cards, nav, modal, etc.)"
```

---

## Task 4: Mock data (`data.js`)

**Files:**
- Modify: `docs/prototype/assets/js/data.js`

- [ ] **Step 1: Write realistic seed data mirroring backend enums.** Use real, specific copy (no lorem). Provide the complete object:

```js
window.WF = {
  enums: {
    userTypes:['job_seeker','company'],
    appStatus:['pending','reviewed','accepted','rejected','withdrawn'],
    salaryType:['hourly','monthly','yearly'],
    skillLevel:['Beginner','Intermediate','Advanced','Expert'],
    degreeType:['High School','Associate','Bachelor','Master','PhD','Certificate','Diploma'],
    companyStatus:['active','inactive','suspended'],
  },
  businessStreams:['Software','Design','Data & AI','Marketing','Finance','Healthcare','Operations','Sales'],
  jobTypes:['Full-time','Part-time','Contract','Internship','Temporary'],
  companies:[
    {id:'c1',name:'Northwind Labs',stream:'Software',website:'northwind.dev',status:'active',
     description:'We build developer tooling used by 40,000 engineering teams. Remote-first, async by default.',
     images:['https://images.unsplash.com/photo-1497366216548-37526070297c?w=900'],logo:'NL'},
    {id:'c2',name:'Acme Health',stream:'Healthcare',website:'acmehealth.io',status:'active',
     description:'Digital-first primary care for 1M+ patients. Mission-driven team blending clinicians and engineers.',images:[],logo:'AH'},
    {id:'c3',name:'Lumen Studio',stream:'Design',website:'lumen.studio',status:'active',
     description:'An independent product studio shaping brands and interfaces for ambitious startups.',images:[],logo:'LS'},
    {id:'c4',name:'Quanta Finance',stream:'Finance',website:'quanta.fi',status:'active',
     description:'Quantitative trading infrastructure. Small team, large impact, generous compensation.',images:[],logo:'QF'},
    {id:'c5',name:'Orbit Marketing',stream:'Marketing',website:'orbit.co',status:'active',
     description:'Growth and brand for category-defining consumer apps.',images:[],logo:'OM'},
    {id:'c6',name:'Vertex Data',stream:'Data & AI',website:'vertex.ai',status:'active',
     description:'Applied ML for logistics. We turn messy operational data into decisions.',images:[],logo:'VD'},
  ],
  jobs:[
    {id:'j1',companyId:'c1',title:'Senior Frontend Engineer',type:'Full-time',city:'Remote',country:'—',
     salaryMin:120000,salaryMax:150000,salaryType:'yearly',deadline:'2026-07-15',posted:'2026-05-20',
     skills:[{name:'React',level:'Advanced',required:true},{name:'TypeScript',level:'Advanced',required:true},{name:'CSS',level:'Intermediate',required:false}],
     description:'Own the component system powering our developer dashboard. You will partner with design to ship a fast, accessible, beautiful UI used daily by thousands of engineers.'},
    {id:'j2',companyId:'c3',title:'Product Designer',type:'Full-time',city:'Berlin',country:'Germany',
     salaryMin:70000,salaryMax:90000,salaryType:'yearly',deadline:'2026-07-01',posted:'2026-05-22',
     skills:[{name:'Figma',level:'Advanced',required:true},{name:'Prototyping',level:'Intermediate',required:true}],
     description:'Lead end-to-end product design for client engagements — from research to polished, shippable interfaces.'},
    {id:'j3',companyId:'c6',title:'Machine Learning Engineer',type:'Full-time',city:'Toronto',country:'Canada',
     salaryMin:130000,salaryMax:175000,salaryType:'yearly',deadline:'2026-08-01',posted:'2026-05-18',
     skills:[{name:'Python',level:'Expert',required:true},{name:'PyTorch',level:'Advanced',required:true}],
     description:'Design and ship models that route thousands of shipments per hour. Strong fundamentals matter more than buzzwords.'},
    {id:'j4',companyId:'c2',title:'Backend Engineer (Django)',type:'Full-time',city:'Remote',country:'—',
     salaryMin:100000,salaryMax:135000,salaryType:'yearly',deadline:'2026-07-20',posted:'2026-05-25',
     skills:[{name:'Django',level:'Advanced',required:true},{name:'PostgreSQL',level:'Intermediate',required:true}],
     description:'Build the APIs behind patient-facing care. Reliability, privacy, and clarity are first-class requirements.'},
    {id:'j5',companyId:'c4',title:'Quantitative Developer',type:'Contract',city:'London',country:'UK',
     salaryMin:90,salaryMax:140,salaryType:'hourly',deadline:'2026-06-30',posted:'2026-05-19',
     skills:[{name:'C++',level:'Expert',required:true},{name:'Low-latency',level:'Advanced',required:true}],
     description:'Optimise execution paths measured in microseconds. Contract with extension potential.'},
    {id:'j6',companyId:'c5',title:'Growth Marketing Intern',type:'Internship',city:'New York',country:'USA',
     salaryMin:25,salaryMax:30,salaryType:'hourly',deadline:'2026-06-25',posted:'2026-05-27',
     skills:[{name:'Analytics',level:'Beginner',required:false}],
     description:'Run experiments across paid and lifecycle channels with a team that ships fast and measures everything.'},
    {id:'j7',companyId:'c1',title:'Engineering Manager',type:'Full-time',city:'Lisbon',country:'Portugal',
     salaryMin:140000,salaryMax:180000,salaryType:'yearly',deadline:'2026-08-10',posted:'2026-05-15',
     skills:[{name:'Leadership',level:'Advanced',required:true}],
     description:'Lead a team of 6 building our platform APIs. We index on outcomes, growth, and humane process.'},
    {id:'j8',companyId:'c3',title:'Brand Designer',type:'Part-time',city:'Remote',country:'—',
     salaryMin:45,salaryMax:65,salaryType:'hourly',deadline:'2026-07-05',posted:'2026-05-28',
     skills:[{name:'Illustration',level:'Advanced',required:true}],
     description:'Shape visual identities for fast-growing startups. Flexible, part-time, fully remote.'},
    {id:'j9',companyId:'c6',title:'Data Analyst',type:'Full-time',city:'Remote',country:'—',
     salaryMin:80000,salaryMax:100000,salaryType:'yearly',deadline:'2026-07-18',posted:'2026-05-21',
     skills:[{name:'SQL',level:'Advanced',required:true},{name:'dbt',level:'Intermediate',required:false}],
     description:'Be the analytical backbone of our ops team — from dashboards to deep dives.'},
    {id:'j10',companyId:'c2',title:'Product Manager, Patient App',type:'Full-time',city:'Remote',country:'—',
     salaryMin:115000,salaryMax:145000,salaryType:'yearly',deadline:'2026-08-05',posted:'2026-05-24',
     skills:[{name:'Discovery',level:'Advanced',required:true}],
     description:'Own the roadmap for the app a million patients rely on. Clinical empathy required.'},
    {id:'j11',companyId:'c4',title:'DevOps Engineer',type:'Full-time',city:'London',country:'UK',
     salaryMin:110000,salaryMax:140000,salaryType:'yearly',deadline:'2026-07-29',posted:'2026-05-23',
     skills:[{name:'Kubernetes',level:'Advanced',required:true},{name:'Terraform',level:'Intermediate',required:true}],
     description:'Keep our low-latency trading infrastructure fast, observable, and bulletproof.'},
    {id:'j12',companyId:'c5',title:'Content Strategist',type:'Full-time',city:'New York',country:'USA',
     salaryMin:75000,salaryMax:95000,salaryType:'yearly',deadline:'2026-07-12',posted:'2026-05-26',
     skills:[{name:'Copywriting',level:'Advanced',required:true}],
     description:'Define the narrative for category-defining consumer brands.'},
  ],
  // The logged-in demo seeker
  seeker:{
    id:'s1',firstName:'Maya',lastName:'Okafor',email:'maya@example.com',
    contact:'+1 555 0142',goals:'Senior frontend role at a product-led, remote-first company.',
    resumeUrl:'mayaokafor-resume.pdf',photo:'',
    education:[
      {id:'e1',school:'University of Toronto',degree:'Bachelor',field:'Computer Science',start:'2014-09',end:'2018-06',percentage:88},
    ],
    experience:[
      {id:'x1',company:'Pixel Forge',position:'Frontend Engineer',city:'Toronto',country:'Canada',start:'2019-01',end:'2023-04',description:'Built and maintained the design system and customer dashboard.'},
      {id:'x2',company:'Brightline',position:'UI Engineer',city:'Remote',country:'—',start:'2023-05',end:'',description:'Lead the migration to a token-based theming system with full dark mode.'},
    ],
    skills:[
      {name:'React',level:'Expert'},{name:'TypeScript',level:'Advanced'},{name:'CSS',level:'Expert'},{name:'Accessibility',level:'Advanced'},
    ],
  },
  // The logged-in demo company (maps to c1)
  companyAccount:{id:'c1'},
  // Seed applications (seeker s1)
  applications:[
    {id:'a1',jobId:'j4',status:'reviewed',applied:'2026-05-26',cover:'I have shipped reliable Django APIs in regulated environments and would love to bring that to patient care.'},
    {id:'a2',jobId:'j2',status:'pending',applied:'2026-05-28',cover:'Design systems are my home turf — excited about Lumen\'s client work.'},
    {id:'a3',jobId:'j9',status:'rejected',applied:'2026-05-20',cover:'Strong SQL background and a love of clean dashboards.'},
  ],
  // Applicants for company c1's jobs (job j1, j7)
  applicants:[
    {id:'p1',jobId:'j1',name:'Daniel Reyes',title:'Frontend Engineer',status:'pending',applied:'2026-05-27',email:'daniel@example.com',
     cover:'Five years of React + TypeScript and a portfolio of accessible component systems.',
     skills:['React','TypeScript','Testing'],experienceYears:5},
    {id:'p2',jobId:'j1',name:'Sara Lindqvist',title:'Senior UI Engineer',status:'reviewed',applied:'2026-05-26',email:'sara@example.com',
     cover:'I care deeply about performance budgets and design fidelity.',skills:['React','CSS','Performance'],experienceYears:7},
    {id:'p3',jobId:'j7',name:'Tom Becker',title:'Tech Lead',status:'accepted',applied:'2026-05-22',email:'tom@example.com',
     cover:'Led teams of 8; I optimise for outcomes and humane process.',skills:['Leadership','Architecture'],experienceYears:9},
  ],
};
```

- [ ] **Step 2: Verify.** Open `index.html`, run `WF.jobs.length` in console → `12`; `WF.companies.length` → `6`.

- [ ] **Step 3: Commit.**
```bash
git add docs/prototype/assets/js/data.js
git commit -m "prototype: add realistic mock data mirroring backend enums"
```

---

## Task 5: App behavior + shared chrome (`app.js`)

**Files:**
- Modify: `docs/prototype/assets/js/app.js`

- [ ] **Step 1: Write the full behavior layer.** Includes icon set, theme, shell rendering (marketing top nav, console sidebar, footer), dropdown/tabs/modal/toast, helpers. Complete code:

```js
(function(){
  var WFApp = window.WFApp = {};
  var root = document.documentElement;

  // ---------- ICONS (Lucide-style, 24x24 stroke) ----------
  var ICONS = {
    sun:'<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
    moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    menu:'<path d="M3 6h18M3 12h18M3 18h18"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
    building:'<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01"/>',
    grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 6.7 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 5 13.6H5a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 6.3 6.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 12 3.3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z"/>',
    logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    check:'<path d="M20 6L9 17l-5-5"/>',
    x:'<path d="M18 6L6 18M6 6l12 12"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z"/>',
    chevron:'<path d="M6 9l6 6 6-6"/>',
  };
  WFApp.icon = function(name,cls){
    var p = ICONS[name]||'';
    return '<svg class="'+(cls||'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
  };

  // ---------- HELPERS ----------
  WFApp.qs = function(name){ return new URLSearchParams(location.search).get(name); };
  WFApp.escapeHtml = function(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); };
  WFApp.money = function(min,max,type){
    var suffix = type==='hourly'?'/hr':type==='monthly'?'/mo':'/yr';
    var unit = type==='hourly'?'$':'$';
    var fmt=function(n){ return type==='hourly'? unit+n : unit+(n/1000)+'k'; };
    return fmt(min)+'–'+fmt(max)+' '+suffix;
  };
  WFApp.company = function(id){ return (WF.companies||[]).filter(function(c){return c.id===id;})[0]; };
  WFApp.job = function(id){ return (WF.jobs||[]).filter(function(j){return j.id===id;})[0]; };
  // relative root prefix so sub-folder pages resolve assets/links
  WFApp.base = function(){ return document.body.getAttribute('data-base')||''; };

  // ---------- SESSION STATE (in-memory, resets on reload) ----------
  WFApp.state = { applications: (WF.applications||[]).slice(), applicants:(WF.applicants||[]).slice() };

  // ---------- THEME ----------
  WFApp.initTheme = function(){
    try{ var t = localStorage.getItem('wf-theme')|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); root.setAttribute('data-theme',t);}catch(e){}
  };
  WFApp.toggleTheme = function(){
    var t = root.getAttribute('data-theme')==='dark'?'light':'dark';
    root.setAttribute('data-theme',t);
    try{ localStorage.setItem('wf-theme',t); }catch(e){}
    var btn=document.querySelector('.theme-toggle'); if(btn) btn.innerHTML = WFApp.icon(t==='dark'?'sun':'moon');
  };
  function themeToggleHtml(){ var t=root.getAttribute('data-theme'); return '<button class="theme-toggle" aria-label="Toggle dark mode" onclick="WFApp.toggleTheme()">'+WFApp.icon(t==='dark'?'sun':'moon')+'</button>'; }

  // ---------- SHELL RENDERING ----------
  var B; // base prefix
  function link(href){ return B+href; }

  function marketingNav(){
    var auth=document.body.getAttribute('data-auth');
    var active=document.body.getAttribute('data-active');
    function navlink(key,href,label){ return '<a href="'+link(href)+'"'+(active===key?' aria-current="page"':'')+'>'+label+'</a>'; }
    var right = auth==='guest'
      ? '<a class="btn btn--ghost btn--sm" href="'+link('login.html')+'">Log in</a><a class="btn btn--primary btn--sm" href="'+link('register.html')+'">Sign up</a>'
      : '<div class="dropdown"><button class="avatar" aria-label="Account menu" aria-haspopup="true" onclick="WFApp._dd(this)">'+(auth==='company'?'NL':'MO')+'</button>'+
        '<div class="dropdown__menu" hidden>'+
          (auth==='seeker'
            ? '<a href="'+link('seeker/dashboard.html')+'">'+WFApp.icon('grid')+'Dashboard</a><a href="'+link('seeker/applications.html')+'">'+WFApp.icon('inbox')+'My Applications</a><a href="'+link('seeker/profile.html')+'">'+WFApp.icon('user')+'Profile</a>'
            : '<a href="'+link('company/dashboard.html')+'">'+WFApp.icon('grid')+'Dashboard</a>')+
          '<a href="'+link('account/settings.html')+'">'+WFApp.icon('settings')+'Settings</a>'+
          '<button onclick="location.href=\''+link('index.html')+'\'">'+WFApp.icon('logout')+'Log out</button>'+
        '</div></div>';
    return '<header class="topnav"><div class="container topnav__inner">'+
      '<a class="brand" href="'+link('index.html')+'"><span class="brand__mark"></span>WORKFRAME</a>'+
      '<nav class="topnav__links" aria-label="Primary">'+navlink('jobs','jobs.html','Find Jobs')+navlink('companies','companies.html','Companies')+navlink('employers','for-employers.html','For Employers')+'</nav>'+
      '<div class="topnav__right">'+themeToggleHtml()+right+
        '<button class="btn btn--ghost btn--sm nav-toggle" aria-label="Menu" onclick="document.querySelector(\'.topnav__links\').classList.toggle(\'open\')">'+WFApp.icon('menu')+'</button>'+
      '</div></div></header>';
  }

  function consoleShell(){
    var active=document.body.getAttribute('data-active');
    function s(key,href,icon,label){ return '<a class="sidebar__link'+(active===key?' sidebar__link--active':'')+'" href="'+link(href)+'">'+WFApp.icon(icon)+label+'</a>'; }
    var side='<aside class="sidebar" id="sidebar"><a class="brand" href="'+link('company/dashboard.html')+'"><span class="brand__mark"></span>WORKFRAME</a>'+
      s('dashboard','company/dashboard.html','grid','Dashboard')+
      s('posts','company/jobs.html','briefcase','Job Posts')+
      s('post-job','company/post-job.html','plus','Post a Job')+
      s('applicants','company/applicants.html','inbox','Applicants')+
      s('company-profile','company/profile.html','building','Company Profile')+
      s('settings','account/settings.html','settings','Settings')+'</aside>';
    var topbar='<div class="console-topbar"><button class="btn btn--ghost btn--sm nav-toggle" aria-label="Menu" onclick="document.getElementById(\'sidebar\').classList.toggle(\'open\')">'+WFApp.icon('menu')+'</button>'+
      '<strong style="font-family:var(--font-display)">Northwind Labs</strong>'+
      '<div class="cluster">'+themeToggleHtml()+'<a class="btn btn--ghost btn--sm" href="'+link('index.html')+'">'+WFApp.icon('logout')+'Log out</a></div></div>';
    return {side:side, topbar:topbar};
  }

  function footer(){
    return '<footer class="footer"><div class="container footer__inner">'+
      '<div><a class="brand" href="'+link('index.html')+'" style="margin-bottom:12px"><span class="brand__mark"></span>WORKFRAME</a><p class="muted" style="max-width:280px">Find work that works for you. A two-sided job marketplace prototype.</p></div>'+
      '<div><strong>For Seekers</strong><a href="'+link('jobs.html')+'">Browse jobs</a><a href="'+link('companies.html')+'">Companies</a></div>'+
      '<div><strong>For Companies</strong><a href="'+link('for-employers.html')+'">Post a job</a><a href="'+link('register.html')+'">Sign up</a></div>'+
      '<div><strong>Workframe</strong><a href="'+link('index.html')+'">Home</a><a href="#">About</a></div>'+
      '</div></footer>';
  }

  WFApp._dd = function(btn){ var m=btn.parentNode.querySelector('.dropdown__menu'); m.hidden=!m.hidden; };
  document.addEventListener('click',function(e){ if(!e.target.closest('.dropdown')) { var o=document.querySelector('.dropdown__menu:not([hidden])'); if(o)o.hidden=true; } });

  WFApp.renderShell = function(){
    B = document.body.getAttribute('data-base')||'';
    var shell=document.body.getAttribute('data-shell');
    var top=document.getElementById('shell-top'), side=document.getElementById('shell-side'), foot=document.getElementById('shell-foot');
    if(shell==='marketing'){ if(top)top.innerHTML=marketingNav(); if(foot)foot.innerHTML=footer(); }
    else if(shell==='console'){ var c=consoleShell(); if(side)side.innerHTML=c.side; /* topbar injected into console layout by page */ document.body.setAttribute('data-console-topbar',''); window.__consoleTopbar=c.topbar; }
    // auth shell: nothing injected
  };

  // ---------- TABS ----------
  WFApp.initTabs = function(root){
    root=root||document; var tabs=root.querySelectorAll('.tab');
    tabs.forEach(function(t){ t.addEventListener('click',function(){
      var group=t.closest('.tabs'); group.querySelectorAll('.tab').forEach(function(x){x.classList.remove('tab--active');x.setAttribute('aria-selected','false');});
      t.classList.add('tab--active'); t.setAttribute('aria-selected','true');
      var panels=document.querySelectorAll('[data-tabpanel]');
      panels.forEach(function(p){ p.hidden = p.getAttribute('data-tabpanel')!==t.getAttribute('data-tab'); });
    }); });
  };

  // ---------- MODAL ----------
  WFApp.openModal = function(html){
    var r=document.getElementById('modal-root');
    r.innerHTML='<div class="modal__scrim" onclick="if(event.target===this)WFApp.closeModal()"><div class="modal__panel" role="dialog" aria-modal="true">'+html+'</div></div>';
    document.addEventListener('keydown',escClose);
  };
  WFApp.closeModal = function(){ document.getElementById('modal-root').innerHTML=''; document.removeEventListener('keydown',escClose); };
  function escClose(e){ if(e.key==='Escape')WFApp.closeModal(); }

  // ---------- TOAST ----------
  WFApp.toast = function(msg,kind){
    var r=document.getElementById('toast-root'); var el=document.createElement('div'); el.className='toast';
    el.innerHTML=WFApp.icon(kind==='error'?'x':'check')+'<span>'+WFApp.escapeHtml(msg)+'</span>'; r.appendChild(el);
    setTimeout(function(){ el.remove(); },3500);
  };

  // ---------- BOOT ----------
  WFApp.initTheme();
  document.addEventListener('DOMContentLoaded',function(){ WFApp.renderShell(); WFApp.initTabs(); });
})();
```

- [ ] **Step 2: Verify.** Open `index.html`. Expected: a sticky top nav with WORKFRAME brand, Find Jobs/Companies/For Employers links, theme toggle (click flips light/dark and persists across reload), Log in/Sign up buttons, and a footer. No console errors.

- [ ] **Step 3: Commit.**
```bash
git add docs/prototype/assets/js/app.js
git commit -m "prototype: add app behavior, shared chrome, theme, tabs, modal, toast"
```

---

## Task 6: Landing page (`index.html`)

**Files:**
- Modify: `docs/prototype/index.html`

Layout follows the **Marketplace/Directory** pattern: Hero (search-focused) → Categories → Featured jobs → Trust → Employer CTA. Avoid the generic centered-hero cliché — left-aligned oversized editorial hero with the accent word.

- [ ] **Step 1: Fill `#main`** with this content (keep `data-shell="marketing" data-auth="guest" data-active=""`):

```html
<section class="hero"><div class="container">
  <p class="muted" style="font-weight:600;letter-spacing:.04em;text-transform:uppercase;font-size:13px">12,480 open roles · 900+ companies</p>
  <h1>Find work that <span class="accent">works</span> for you.</h1>
  <p class="muted" style="max-width:540px;font-size:18px">Search thousands of roles from companies hiring right now — then apply in one place and track every application.</p>
  <form class="searchbar" onsubmit="location.href='jobs.html';return false;">
    <input class="input" placeholder="Search role, skill or company…" aria-label="Search jobs" />
    <button class="btn btn--primary" type="submit">Search jobs</button>
  </form>
</div></section>

<section class="section"><div class="container">
  <div class="section-head"><h2>Browse by category</h2></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))" id="cat-grid"></div>
</div></section>

<section class="section" style="background:var(--surface-2)"><div class="container">
  <div class="section-head"><h2>Featured roles</h2><a class="btn btn--ghost btn--sm" href="jobs.html">View all</a></div>
  <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(300px,1fr))" id="feat-grid"></div>
</div></section>

<section class="section"><div class="container" style="display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
  <div class="card"><h3>Verified companies</h3><p class="muted">Every employer is a real, active company profile.</p></div>
  <div class="card"><h3>One-click apply</h3><p class="muted">Apply with your Workframe profile and a short cover letter.</p></div>
  <div class="card"><h3>Track everything</h3><p class="muted">See application status from pending to accepted in one dashboard.</p></div>
</div></section>

<section class="section" style="background:var(--ink);color:var(--bg)"><div class="container" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:24px">
  <div><h2 style="color:var(--bg)">Hiring? Post a job in minutes.</h2><p style="color:var(--bg);opacity:.8;margin:0">Reach qualified candidates and manage applicants in one console.</p></div>
  <a class="btn btn--primary" href="for-employers.html">Post a job</a>
</div></section>
```

- [ ] **Step 2: Add a page script** before `</body>` (after app.js) to render categories + featured jobs from data:

```html
<script>
  document.addEventListener('DOMContentLoaded',function(){
    document.getElementById('cat-grid').innerHTML = WF.businessStreams.map(function(s){
      return '<a class="card" style="text-align:center" href="jobs.html?stream='+encodeURIComponent(s)+'">'+WFApp.icon('grid')+'<div style="font-family:var(--font-display);font-weight:700;margin-top:8px">'+s+'</div></a>';
    }).join('');
    document.getElementById('feat-grid').innerHTML = WF.jobs.slice(0,6).map(function(j){
      var c=WFApp.company(j.companyId);
      return '<a class="job-card" href="job-detail.html?id='+j.id+'">'+
        '<div class="cluster" style="justify-content:space-between"><span class="chip">'+j.type+'</span><span class="badge">'+WFApp.icon('pin')+j.city+'</span></div>'+
        '<h3 class="job-card__title" style="margin-top:12px">'+j.title+'</h3>'+
        '<div class="job-card__meta">'+c.name+'</div>'+
        '<div class="cluster" style="justify-content:space-between;margin-top:16px"><span class="job-card__salary">'+WFApp.money(j.salaryMin,j.salaryMax,j.salaryType)+'</span><span class="btn btn--secondary btn--sm">View</span></div>'+
      '</a>';
    }).join('');
  });
</script>
```

- [ ] **Step 3: Verify.** Open `index.html`. Expected: editorial hero with accent "works"; category grid (8 streams) linking to filtered jobs; 6 featured job cards with real titles/companies/salaries that lift on hover; dark CTA band. Toggle theme — everything adapts. Resize to 375px — searchbar stacks, no horizontal scroll.

- [ ] **Step 4: Commit.**
```bash
git add docs/prototype/index.html
git commit -m "prototype: build landing page (marketplace pattern)"
```

---

## Task 7: Browse Jobs (`jobs.html`)

**Files:** Create `docs/prototype/jobs.html` (copy the Task 1 head pattern; `data-active="jobs"`).

- [ ] **Step 1: `#main` content** — a two-column layout: filters sidebar + results. Reads `?stream=`/`?search=` from URL.
```html
<div class="container section">
  <div class="section-head"><h1 style="font-size:clamp(1.75rem,4vw,2.5rem)">Browse jobs</h1><span class="muted" id="result-count"></span></div>
  <div class="grid" style="grid-template-columns:280px 1fr;align-items:start" id="jobs-layout">
    <form class="filters stack" id="filters" onsubmit="return false">
      <div class="field"><label class="field__label" for="f-q">Keyword</label><input class="input" id="f-q" placeholder="Title, company…"></div>
      <div class="field"><label class="field__label" for="f-type">Job type</label><select class="select" id="f-type"><option value="">All types</option></select></div>
      <div class="field"><label class="field__label" for="f-stream">Category</label><select class="select" id="f-stream"><option value="">All categories</option></select></div>
      <div class="field"><label class="field__label" for="f-min">Min salary (yearly)</label><input class="input" id="f-min" type="number" placeholder="e.g. 80000"></div>
      <button class="btn btn--ghost btn--sm" type="button" onclick="WFApp.clearFilters()">Clear filters</button>
    </form>
    <div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr))" id="results"></div><div class="pagination" id="pager"></div></div>
  </div>
</div>
```
- [ ] **Step 2: Add page script** that populates selects, applies filters live (`input`/`change` listeners), renders job cards (same markup as Task 6 featured card), paginates 9/page, shows an `.empty` state when zero, and prefills from `?stream=`/`?search=`. Define `WFApp.clearFilters()` inline on the page to reset inputs and re-render. (Filtering is client-side over `WF.jobs`; match keyword against title+company, type, stream via company, and `salaryMin` for yearly jobs.)

- [ ] **Step 3: Verify.** Open `jobs.html`. Expected: all 12 jobs as cards; typing in Keyword filters instantly; selecting a type/category narrows; clearing restores; result count updates; visiting `jobs.html?stream=Design` pre-filters. Empty state shows for impossible filters. Theme + 375px verified (filters stack above results).

- [ ] **Step 4: Commit.** `git add docs/prototype/jobs.html && git commit -m "prototype: build browse jobs with live filters + pagination"`

---

## Task 8: Job Detail (`job-detail.html`)

**Files:** Create `docs/prototype/job-detail.html` (`data-active="jobs"`). Reads `?id=`.

- [ ] **Step 1: `#main`** — breadcrumb, two-column: main (title, company link, meta badges, description, required skills as chips) + sticky aside (salary, type, location, deadline, **Apply** primary button). If `data-auth="guest"`, Apply says "Log in to apply" → `login.html`. Provide a container `<div id="job-root"></div>` filled by script.
- [ ] **Step 2: Page script** reads `WFApp.qs('id')`, looks up `WFApp.job(id)` + company; if missing render `.empty` with link back to jobs. Renders details. The Apply button (seeker) calls `WFApp.applyModal(jobId)` (defined in Task 19); for guest it links to login. Use `WFApp.icon` for pin/clock/briefcase. Required skills as `.chip` with level; mark required vs optional.
- [ ] **Step 3: Verify.** `job-detail.html?id=j1` shows the Senior Frontend Engineer post with Northwind Labs, salary, skills chips, sticky apply card. Bad id shows empty state. Company name links to `company-public.html?id=c1`. Theme + mobile (aside stacks under main).
- [ ] **Step 4: Commit.** `prototype: build job detail page`

---

## Task 9: Browse Companies (`companies.html`)

**Files:** Create `docs/prototype/companies.html` (`data-active="companies"`).
- [ ] **Step 1: `#main`** — `h1` "Companies", a search input + stream filter, and a `#company-grid`.
- [ ] **Step 2: Script** renders `.company-card`s from `WF.companies` (logo square with initials, name, stream chip, truncated description, open-roles count computed from `WF.jobs`), linking to `company-public.html?id=`. Live filter by name + stream.
- [ ] **Step 3: Verify.** 6 companies render with role counts; filter works; cards link through; theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build browse companies`

---

## Task 10: Company Public Profile (`company-public.html`)

**Files:** Create `docs/prototype/company-public.html` (`data-active="companies"`). Reads `?id=`.
- [ ] **Step 1: `#main`** — header band (logo, name, stream, website link, status), description, image gallery (if any, else hidden), then "Open roles at {company}" grid of that company's job cards.
- [ ] **Step 2: Script** looks up company; lists `WF.jobs` where `companyId===id`; empty state if none. Bad id → empty state.
- [ ] **Step 3: Verify.** `company-public.html?id=c1` shows Northwind Labs + its 2 roles (j1, j7). Theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build company public profile`

---

## Task 11: For Employers (`for-employers.html`)

**Files:** Create `docs/prototype/for-employers.html` (`data-active="employers"`).
- [ ] **Step 1: `#main`** — employer-focused marketing: oversized hero ("Hire people who fit."), 3 benefit cards (Reach candidates / Manage applicants / One console), a simple 3-step "how it works", and a primary CTA → `register.html`. Use the editorial style, single primary CTA.
- [ ] **Step 2: Verify.** Renders on-brand in both themes; CTA links to register; mobile stacks cleanly.
- [ ] **Step 3: Commit.** `prototype: build for-employers marketing page`

---

## Task 12: 404 (`404.html`)

**Files:** Create `docs/prototype/404.html` (`data-active=""`).
- [ ] **Step 1: `#main`** — centered `.empty`-style block: huge "404", "This page took a different job.", button home + button browse jobs.
- [ ] **Step 2: Verify.** Renders both themes; links work.
- [ ] **Step 3: Commit.** `prototype: build 404 page`

---

## Task 13: Login (`login.html`)

**Files:** Create `docs/prototype/login.html` (`data-shell="auth" data-auth="guest" data-active=""`).
- [ ] **Step 1: `#main`** — centered card (max-width 420px): brand, `h1` "Log in", email + password fields (with labels + `autocomplete`), password show/hide toggle, primary "Log in" button, link to register. Plus a divider and **two demo buttons**: "Continue as demo Seeker" / "Continue as demo Company".
- [ ] **Step 2: Script** — demo Seeker button → `seeker/dashboard.html`; demo Company → `company/dashboard.html`. Form submit (any input) → seeker dashboard + toast "Welcome back". Password toggle flips input type and `aria-pressed`.
- [ ] **Step 3: Verify.** Both demo paths navigate correctly; toggle works; focus rings; theme; 375px.
- [ ] **Step 4: Commit.** `prototype: build login with demo shortcuts`

---

## Task 14: Register (`register.html`)

**Files:** Create `docs/prototype/register.html` (`data-shell="auth" data-auth="guest"`).
- [ ] **Step 1: `#main`** — centered card with a **role toggle** (two `.tab`-style buttons: "Job Seeker" / "Company"). Common fields: email, password (hint: min 10 chars). Seeker panel: first name, last name. Company panel: company name, business stream select. Primary "Create account".
- [ ] **Step 2: Script** — role toggle switches which `[data-tabpanel]` shows and stores chosen role; submit routes Seeker→`seeker/dashboard.html`, Company→`company/dashboard.html` with a success toast. Stream select populated from `WF.businessStreams`.
- [ ] **Step 3: Verify.** Toggling role swaps fields; both submissions route correctly; theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build register with role toggle`

---

## Task 15: Seeker Dashboard (`seeker/dashboard.html`)

**Files:** Create `docs/prototype/seeker/dashboard.html`. Use `data-base="../"`, `data-shell="marketing" data-auth="seeker" data-active="dashboard"`. **Note:** sub-folder pages set `data-base="../"` and use `../assets/...` in the head links.
- [ ] **Step 1: `#main`** — `h1` "Welcome back, Maya", a row of 4 `.stat-card`s (Total applications, Pending, Reviewed, Accepted — counts from `WFApp.state.applications`), a "Recommended for you" job grid (first 3 jobs), and a "Recent applications" mini-list linking to `applications.html`.
- [ ] **Step 2: Script** computes counts by status; renders job cards (with `../job-detail.html?id=` links) and recent applications (job title + status badge).
- [ ] **Step 3: Verify.** Stats reflect the 3 seed applications (1 pending, 1 reviewed, 1 rejected → accepted 0); avatar dropdown shows seeker links; theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build seeker dashboard`

---

## Task 16: Seeker Profile with tabs (`seeker/profile.html`)

**Files:** Create `docs/prototype/seeker/profile.html` (`data-base="../"`, `data-auth="seeker" data-active="profile"`).
- [ ] **Step 1: `#main`** — profile header (avatar initials, name, goals), then a `.tabs` bar with 4 tabs (`data-tab` = overview/education/experience/skills) and 4 `[data-tabpanel]` panels:
  - **Overview:** editable-looking fields (first/last name, contact, goals, résumé URL) + Save button (toast on save).
  - **Education:** list `WF.seeker.education` as `.card`s (school, degree+field, dates, %), each with Edit/Delete (Delete removes from DOM + toast); "Add education" opens a modal with a form (on submit, prepend a card + toast).
  - **Experience:** same pattern for `WF.seeker.experience` (company, position, location, dates, description; "Present" if no end).
  - **Skills:** list `WF.seeker.skills` as chips with level; "Add skill" modal (skill text + level select from `WF.enums.skillLevel`).
- [ ] **Step 2: Script** wires Save/Add/Delete with `WFApp.openModal`/`toast`. Tabs already initialized by `WFApp.initTabs()`. Set initial panel from `?tab=` if present.
- [ ] **Step 3: Verify.** Tabs switch panels; Add opens a modal, submitting adds an item; Delete removes; Save toasts. Keyboard: tabs reachable, Esc closes modal. Theme + mobile (tabs scroll horizontally).
- [ ] **Step 4: Commit.** `prototype: build seeker profile with tabs (overview/education/experience/skills)`

---

## Task 17: My Applications (`seeker/applications.html`)

**Files:** Create `docs/prototype/seeker/applications.html` (`data-base="../"`, `data-auth="seeker" data-active="applications"`).
- [ ] **Step 1: `#main`** — `h1` "My applications", status filter chips (All/Pending/Reviewed/Accepted/Rejected/Withdrawn), and a list of application rows (job title+company, applied date via, status badge, "View" → `application-detail.html?id=`, and **Withdraw** for pending/reviewed).
- [ ] **Step 2: Script** renders from `WFApp.state.applications` joined to `WFApp.job`; filter chips filter by status; Withdraw sets status to `withdrawn` in state + re-renders + toast. Empty state when a filter has none.
- [ ] **Step 3: Verify.** 3 applications show with correct badges; filtering by "Pending" shows one; Withdraw changes the badge to Withdrawn and removes the button. Theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build my applications list`

---

## Task 18: Application Detail (`seeker/application-detail.html`)

**Files:** Create `docs/prototype/seeker/application-detail.html` (`data-base="../"`, `data-auth="seeker" data-active="applications"`). Reads `?id=`.
- [ ] **Step 1: `#main`** — breadcrumb back to applications; the job summary card (title, company, salary, link to job); the submitted cover letter; a status **timeline** (Applied → Reviewed → Decision) with the current status highlighted using badges/icons.
- [ ] **Step 2: Script** finds the application in state by id; renders; bad id → empty state.
- [ ] **Step 3: Verify.** `application-detail.html?id=a1` shows the reviewed Django application with cover letter + timeline. Theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build application detail`

---

## Task 19: Apply flow (modal) — wire into Job Detail

**Files:** Modify `docs/prototype/assets/js/app.js` (add `WFApp.applyModal`); ensure `job-detail.html` calls it.
- [ ] **Step 1: Add `WFApp.applyModal(jobId)`** to app.js: opens a modal with the job title, a cover-letter `.textarea` (required), Cancel + "Submit application" buttons. On submit: push `{id:'a'+Date.now(), jobId, status:'pending', applied:'today', cover}` to `WFApp.state.applications`, close modal, toast "Application submitted", and if on job-detail, swap the Apply button for a disabled "Applied ✓".
- [ ] **Step 2: Verify.** From `job-detail.html?id=j3` as seeker (open via `seeker/dashboard.html` → a job, or set `data-auth="seeker"`), click Apply → modal → submit → toast; then `seeker/applications.html` shows the new application as Pending. Esc closes the modal; empty cover letter blocks submit with a field error.
- [ ] **Step 3: Commit.** `prototype: add apply modal flow + applications integration`

---

## Task 20: Company console shell + Dashboard (`company/dashboard.html`)

**Files:** Create `docs/prototype/company/dashboard.html` (`data-base="../"`, `data-shell="console" data-auth="company" data-active="dashboard"`).
- [ ] **Step 1: Console layout.** Console pages wrap content in the grid shell. After `WFApp.renderShell()` injects the sidebar into `#shell-side`, the page must place the topbar + main. Use this body structure for ALL company pages:
```html
<div class="app-console">
  <div id="shell-side"></div>
  <div><div id="console-topbar-mount"></div><div class="console-main" id="main">…</div></div>
</div>
```
And add to each console page's script: `document.getElementById('console-topbar-mount').innerHTML = window.__consoleTopbar;` after DOMContentLoaded. (Update Task 1 head usage: console pages keep `#shell-top`/`#shell-foot` out; keep `#toast-root`/`#modal-root`.)
- [ ] **Step 2: `#main` content** — `h1` "Dashboard", 3 `.stat-card`s (Active posts = company's jobs count; Total applicants = `WFApp.state.applicants` for company jobs; New this week), a "Recent applicants" `.table` (name, role, status badge, link to applicant-detail), and a primary "Post a Job" button.
- [ ] **Step 3: Verify.** Sidebar shows with Dashboard active; topbar shows company name + theme toggle + logout; stats compute from data; sidebar collapses to a drawer under 1024px (hamburger toggles `.open`). Theme verified.
- [ ] **Step 4: Commit.** `prototype: build company console shell + dashboard`

---

## Task 21: Manage Job Posts (`company/jobs.html`)

**Files:** Create `docs/prototype/company/jobs.html` (`data-active="posts"`, console structure from Task 20).
- [ ] **Step 1: `#main`** — `section-head` with `h1` "Job posts" + "Post a Job" button; a `.table` of the company's jobs (title, type, applicants count, status [Published/Closed] as badge, actions: Edit → `post-job.html?id=`, View applicants → `applicants.html?job=`, and a publish/close toggle that flips the badge in-memory + toast).
- [ ] **Step 2: Verify.** Northwind's jobs (j1, j7) listed with applicant counts (j1=2, j7=1); toggling status updates badge; links navigate. Theme + mobile (table scrolls horizontally).
- [ ] **Step 3: Commit.** `prototype: build manage job posts`

---

## Task 22: Post / Edit Job (`company/post-job.html`)

**Files:** Create `docs/prototype/company/post-job.html` (`data-active="post-job"`). Reads optional `?id=` for edit.
- [ ] **Step 1: `#main`** — a form (`.card`): title, description (`.textarea`), job type select (`WF.jobTypes`), city, country, salary min/max, salary type select (`WF.enums.salaryType`), deadline (date input), and a **skills repeater** (add rows of skill name + level select + required checkbox). Primary "Publish job" + secondary "Save draft".
- [ ] **Step 2: Script** — if `?id=`, prefill from `WFApp.job(id)` and change heading to "Edit job". "Add skill" appends a row; remove buttons delete rows. Submit → toast "Job published" → redirect `jobs.html`. Basic required-field validation with inline `.field__error` + focus first invalid.
- [ ] **Step 3: Verify.** Empty form publishes after filling required fields; `post-job.html?id=j1` prefills the Senior Frontend Engineer post incl. its skills rows. Validation blocks empty title. Theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build post/edit job form`

---

## Task 23: Job Applicants (`company/applicants.html`)

**Files:** Create `docs/prototype/company/applicants.html` (`data-active="applicants"`). Optional `?job=`.
- [ ] **Step 1: `#main`** — `h1` "Applicants"; if `?job=` present, a subheading with the job title + a job filter select (company's jobs); a `.table`/card-list of applicants (name, current title, years exp, applied date, status badge, actions: View → `applicant-detail.html?id=`, quick **Accept**/**Reject**).
- [ ] **Step 2: Script** lists `WFApp.state.applicants` (filtered by `?job=` if set); Accept/Reject update status in state + toast + re-render. Empty state if none.
- [ ] **Step 3: Verify.** `applicants.html?job=j1` shows Daniel + Sara; Accept flips a badge to Accepted; job filter switches lists. Theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build job applicants list with status actions`

---

## Task 24: Applicant Detail (`company/applicant-detail.html`)

**Files:** Create `docs/prototype/company/applicant-detail.html` (`data-active="applicants"`). Reads `?id=`.
- [ ] **Step 1: `#main`** — breadcrumb; applicant header (name, title, contact, status badge); two columns: left = profile summary (skills chips, years experience, a short bio/cover letter); right = a sticky action card with status select/buttons (Mark reviewed / Accept / Reject) that update state + toast.
- [ ] **Step 2: Script** finds applicant by id in state; renders; status actions update + reflect immediately; bad id → empty state.
- [ ] **Step 3: Verify.** `applicant-detail.html?id=p1` shows Daniel Reyes; clicking Accept updates the badge + toasts. Theme + mobile (action card stacks).
- [ ] **Step 4: Commit.** `prototype: build applicant detail with status actions`

---

## Task 25: Company Profile (`company/profile.html`)

**Files:** Create `docs/prototype/company/profile.html` (`data-active="company-profile"`).
- [ ] **Step 1: `#main`** — a form (`.card`): company name, business stream select, website, contact email, description (`.textarea`), status select (`WF.enums.companyStatus`). Below, an **Images** section: a grid of current images (from `WF.companies` c1) each with a Remove button, plus an "Upload image" button that opens a modal with a URL input (faked upload) → adds a tile + toast. Primary "Save changes".
- [ ] **Step 2: Script** prefills from `WFApp.company('c1')`; Save → toast; image add/remove update the grid in-memory.
- [ ] **Step 3: Verify.** Form prefilled with Northwind Labs; adding an image URL adds a tile; Save toasts. Theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build company profile + image gallery`

---

## Task 26: Account Settings (`account/settings.html`)

**Files:** Create `docs/prototype/account/settings.html` (`data-base="../"`). **Shell depends on role** — default to `data-shell="marketing" data-auth="seeker" data-active="settings"` (reachable from both menus; the seeker top-nav variant is acceptable for the prototype).
- [ ] **Step 1: `#main`** — `h1` "Account settings"; sections (each a `.card`): **Profile** (email, contact number, date of birth, sex select M/F/Other, profile photo URL + faked upload); **Password** (current, new, confirm with min-10 hint + show/hide); each section has its own Save button → toast.
- [ ] **Step 2: Script** wires Save buttons to toasts; password show/hide toggles; basic confirm-match validation with inline error.
- [ ] **Step 3: Verify.** Both sections render; saving toasts; password mismatch shows an error. Theme + mobile.
- [ ] **Step 4: Commit.** `prototype: build account settings`

---

## Task 27: Cross-screen design-quality & accessibility QA pass

**Files:** touch any screen needing fixes.
- [ ] **Step 1: Run the ui-ux-pro-max pre-delivery checklist across every page.** For each of the ~22 screens verify: (a) **no emoji** used as icons (SVG only); (b) one `<h1>`, sequential headings; (c) every interactive element has cursor-pointer + visible hover + focus-visible ring; (d) labels on all inputs, required marked, errors inline; (e) status uses icon+text not color alone; (f) one primary CTA per screen; (g) z-index uses the scale only; (h) sticky navs don't cover content.
- [ ] **Step 2: Theme + responsive sweep.** Load every page in light AND dark; at 375px and 1440px. Fix any overflow, contrast, or layout breakage. Verify `prefers-reduced-motion` disables the hover transforms (toggle OS setting or emulate in devtools).
- [ ] **Step 3: Keyboard sweep.** Tab through landing, jobs (filters), profile (tabs), apply modal (Esc closes, focus sensible). Fix tab traps / invisible focus.
- [ ] **Step 4: Commit fixes.** `git commit -m "prototype: accessibility + design-quality QA pass"`

---

## Task 28: Prototype README

**Files:** Create `docs/prototype/README.md`.
- [ ] **Step 1: Write** a short guide: what this is (clickable static prototype), how to open (double-click `index.html` or `python -m http.server` in this folder), the demo-login shortcuts, the two walkthrough flows (Seeker apply; Company post→review), the theme toggle, and the explicit limitation that data is in-memory/session-only (resets on reload) with no backend.
- [ ] **Step 2: Verify.** Links in the README resolve; instructions are accurate.
- [ ] **Step 3: Commit.** `prototype: add prototype README`

---

## Self-Review (completed by plan author)

**Spec coverage:** All 22 spec screens map to tasks — Public §3.1 → Tasks 6–12; Auth §3.2 → 13–14; Seeker §3.3 → 15–19; Company §3.4 → 20–25; Shared §3.5 → 2 (theme), 26 (settings). Design system §2 → Tasks 2–3 (tokens/components) + 5 (icons/theme). Tech §4 → Tasks 1,4,5. Accessibility §2.5 → Task 27. Acceptance §6 → Tasks 27–28.

**Placeholders:** Foundation tasks (2–5, 6) contain complete code. Screen tasks specify exact structure, components, content source, and verification; they intentionally reference the fully-defined foundation rather than re-pasting CSS/JS (the executing agent reads the built `styles.css`/`app.js`). No "TBD/handle edge cases" left.

**Type/name consistency:** Class names, `data-*` attributes, and `WFApp.*` function names are declared once in Conventions and reused verbatim. `WFApp.applyModal` (Task 19), `WFApp.clearFilters` (Task 7, page-local), `window.__consoleTopbar` (Tasks 5/20) are consistent. Sub-folder pages use `data-base="../"` and `../assets/...` (Tasks 15–26).

**Known adaptation:** This is a static visual prototype, so verification is browser-based observation rather than unit tests (TDD does not fit zero-logic markup). This is an intentional, documented deviation from the default TDD task shape.
