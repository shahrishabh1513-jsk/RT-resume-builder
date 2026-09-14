# RT Resume Builder

**Build a Resume. Build Your Future.**

A complete, frontend-only resume builder — HTML5, vanilla JavaScript (ES6+), CSS3 and LocalStorage. No backend, no build step, no account required.

## Features

- **Resume Builder** — 13 content sections (personal info, summary, experience, education, skills, projects, certifications, languages, achievements, volunteer, interests, references, custom sections), each with add / duplicate / remove / reorder (drag-and-drop).
- **Live Preview** — the resume paper on the right updates on every keystroke, no reload.
- **4 original templates** — Classic, Modern, Minimal, Executive — genuinely different layouts, not one template recolored.
- **Design customization** — accent color, font, font size, spacing, heading style, margins, and drag-to-reorder / show-hide section order.
- **Multiple resumes** — unlimited resumes stored independently in LocalStorage.
- **Dashboard** — stats, search, filter, sort, grid/list view, duplicate/rename/delete.
- **ATS Checker** — a local, simulated resume score (0–100) across 7 categories, a plain-language issue list, and keyword matching against a target job title.
- **Cover Letter Builder** — matching A4 preview, local draft generation, import from your active resume.
- **Export** — real PDF (via html2pdf.js), plain TXT, and full JSON backup/restore.
- **Autosave** with a visible Saving… / Saved indicator (debounced).
- **Undo / Redo** for structural changes (add/remove/reorder/design/template), with Ctrl+Z / Ctrl+Y.
- **Dark mode**, fully responsive (desktop / tablet / mobile with bottom tab navigation), print stylesheet.
- **Local, rule-based writing suggestions** for summaries and experience bullets, keyed by job title — clearly labeled as not a live AI model, and structured so a real AI API could be dropped in later.

## Technology

HTML5, CSS3 (Grid, Flexbox, custom properties, native drag-and-drop), vanilla JavaScript ES6+, LocalStorage, JSON. One external library: **html2pdf.js** (loaded from a CDN) for real PDF export — everything else is dependency-free.

## Folder structure

```
RT-Resume-Builder/
├── index.html            Landing page
├── templates.html        Template gallery
├── builder.html           Resume builder (core app)
├── dashboard.html         Multiple resumes, stats, search/filter/sort
├── ats-checker.html       ATS score + keyword matcher
├── cover-letter.html      Cover letter builder
├── css/                   style, responsive, landing, templates, builder, resume, dashboard, print
├── js/                    storage, resume-data, resume-preview, resume-builder, templates,
│                          ats-checker, cover-letter, pdf-export, ui, icons, navigation,
│                          suggestions-data, sample-data, dashboard, templates-page, app
├── data/                  templates.json / skills.json (reference copies — see data/README.txt)
└── assets/                logo / icons / template thumbnails / images
```

## How to run

Open `index.html` directly in a browser, or serve the folder with any static server, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`. No build step, no install.

## How to use

1. From the homepage or dashboard, click **Create Resume**, pick a resume type, then a template.
2. Fill in sections from the left-hand sidebar in the builder — the preview on the right updates live.
3. Use the **Design** tab to change color, font, spacing and section order.
4. Check your **ATS Score** any time from the builder header or the ATS Checker page.
5. Download a **PDF**, **TXT**, or a full **JSON backup** from the Download menu.

## LocalStorage architecture

Everything lives under a handful of keys (see `js/storage.js`), all namespaced `rt_*`:
- `rt_resumes` — a map of `{ id: resumeObject }`, one shared schema for every template (see `js/resume-data.js`).
- `rt_active_resume_id`, `rt_cover_letters`, `rt_active_cover_id`, `rt_theme`, `rt_settings`.

`storage.js` is the only module that touches `localStorage` directly, so the persistence layer can be swapped for a real backend later without touching the UI code.

## PDF export

`js/pdf-export.js` clones the live-rendered resume into an off-screen A4 element and hands it to `html2pdf.js`, producing a real, selectable-text, multi-page-capable PDF — not a screenshot of the app UI.

## ATS checker

`js/ats-checker.js` is a local, rule-based analyzer (missing fields, weak bullets, missing measurable achievements, thin sections, keyword coverage against a target job title). It is explicitly labeled in the UI as a simulated, local check — not a real employer ATS.

## Known limitations / scope notes

This build focuses on the features an actual user would touch every day, and intentionally leaves out a few things from a full 90-section spec:
- **4 templates instead of 8** (Classic, Modern, Minimal, Executive) — each is a genuinely distinct layout; adding more is mostly a CSS exercise using the existing `resume.css` pattern.
- **No login/signup, pricing, or payments** — these would only be believable with a real backend, so rather than fake authentication or payment processing (which the product should never do), those pages were left out. They're easy to add as demo-only UI later if wanted.
- **Resume import from PDF/DOCX** isn't implemented — real parsing needs a backend or a heavy client-side library. `dashboard.html`'s **Import Resume** button supports the fully-functional path: importing a previously exported **JSON** backup.
- **Text-field edits autosave continuously** (like a document editor) rather than being individually undoable keystroke-by-keystroke; **structural changes** (add/remove/reorder entries, template/design changes) are fully undo/redo-able via Ctrl+Z / Ctrl+Y.
- `data/suggestions.json` and `data/sample-resume.json` are kept as plain-text notes rather than fetched JSON files, because opening `index.html` via `file://` blocks `fetch()` of local JSON in most browsers. The same data is embedded directly as JS in `js/suggestions-data.js` and `js/sample-data.js` so the app works with zero setup.

## Deployment

Static files only — deploys as-is to Netlify, Vercel, or GitHub Pages. No environment variables, no server.

## Future improvements

- Real AI API integration behind the existing `RTSuggest` / suggestion functions.
- Backend sync (accounts, cloud storage) behind the existing `storage.js` interface.
- PDF/DOCX resume import via a parsing service.
- Additional templates and section-level custom color per template.
