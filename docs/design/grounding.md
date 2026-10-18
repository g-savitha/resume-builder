# Grounding: company-themed resume builder (greenfield)

Owner: Rakendu (Savitha Gollamudi), frontend-strong dev (React, Redux, TS, Node). Standalone new repo `g-savitha/resume-builder`, static site on a free host. No existing system to integrate, so architect Phase A is skipped; this file is the shared grounding.

## Inspiration
An X post showed a resume styled as the Netflix UI (https://x.com/_vmlops/status/2111839113695654141): Netflix "N" mark, name in a title card with Play / More Info buttons, "#1 in Applicants Today" badge, Education and Skills as Netflix tiles with "+" buttons, "Explore titles related to: Work Experience" with each job as an episode row (play, +, thumbs up/down), Academic projects and Achievements cards. Dark charcoal background, Netflix red accents. Image: /workspace/netflix-resume.jpg.
Goal: a builder where the SAME resume content can be rendered in many company themes (Netflix, Spotify, Google, Apple, Amazon, GitHub, ... each reinterpreting that company's UI language and vocabulary), plus a plain ATS-safe theme.

## FlowCV-like features wanted (v1 unless marked later)
- Form editor on the left, live preview on the right (WYSIWYG-ish preview of the real pages).
- Standard sections: personal/contact, summary, experience, education, skills, projects, achievements/awards, certifications, languages, plus user-defined custom sections.
- Reorder sections and items by drag and drop; hide/show sections and items.
- Rich-ish text for bullets (bold/italic/links, bullet lists); no arbitrary HTML.
- Theme switcher; per-resume customization: accent color, font, font size, line/section spacing, page size (A4 / US Letter), margins.
- Real page pagination in preview (content flows across pages), page count shown.
- PDF export with selectable, ATS-readable text in logical reading order (print-CSS / browser print is acceptable for v1; a library is fine if justified).
- Multiple resumes, duplicate a resume, autosave (localStorage / IndexedDB), import/export JSON (consider JSON Resume schema compatibility at the boundary).
- Later: undo/redo, shareable public link, cover letters, AI bullet rewriting, cloud sync/accounts.

## Constraints and preferences
- Editor app UI is LIGHT themed for this project (company themes keep their own brand colors, e.g. Netflix stays dark).
- React + TypeScript strongly preferred (her stack); Vite or similar; no backend in v1.
- Code must be reusable and agent-friendly: adding a new company theme should be one self-contained folder, no hand-synced registries. Adding a new section type should be a localized change.
- Themes must not reach into editor state or storage; they render from domain data + customization.
- Avoid using real trademarked logos as image assets; themes draw lookalike UI, not official logos (flag as risk).
- Must work well on desktop; mobile can be view/preview-focused.

## REQUIREMENT CHANGE (from the owner, supersedes "hand-built themes per company")
The user applies to many companies (Microsoft, Experian, ...) and wants a resume themed for THE company they are applying to. Flow: the app asks which company they're applying to (name and/or website URL), fetches that company's logo / brand assets, extracts brand colors (from the logo, favicon, site theme-color / CSS, or a brand API), and GENERATES a theme from them. So themes must be derivable for arbitrary companies, not only hand-authored.
Design implications to address:
- A generic "brand-derived theme" pipeline: CompanyQuery -> BrandProfile (name, domain, logo, palette, maybe fonts) -> Theme (tokens + layout choice + vocabulary). Hand-crafted bespoke themes (e.g. Netflix UI parody) can still exist as optional overrides/presets for well-known companies, but generated themes are the default path.
- Color science: pick primary/secondary/accent from a logo palette, ensure WCAG contrast for text, light vs dark page variants, fallback when extraction fails, user can tweak.
- Fetching brand data from a static browser app hits CORS: decide where that lives (a tiny serverless function / edge proxy, a third-party brand API like Brandfetch/Clearbit-logo/favicon services, or user uploads the logo). Keep it behind one boundary returning a domain BrandProfile; v1 may need a minimal serverless function, justify.
- Caching of BrandProfiles, per-resume "target company" field, quickly switching target company for the same resume content (one resume, many tailored variants).
- Logo/trademark: showing the target company's logo on your own application resume is a judgment call; make logo display optional.

## ACCESSIBILITY (hard requirement from the owner)
- Editor app: WCAG 2.2 AA. Full keyboard operation including drag-and-drop reorder (keyboard alternative, e.g. move up/down + dnd-kit keyboard sensor), visible focus, labeled form fields, ARIA live announcements for reorder/autosave, reduced-motion respected, no color-only cues.
- Generated resumes: every derived theme must pass WCAG AA contrast (4.5:1 body text, 3:1 large text / UI) enforced in the theme derivation itself (types or a validated constructor, not a lint after the fact); brand colors get adjusted, not used raw, when they fail.
- Exported PDF: real text in logical reading order, semantic headings, document language and title set, links real; decorative brand visuals marked decorative. Aim for tagged/accessible PDF where the chosen PDF approach allows; state the limits.
- Testing: axe-core in tests for editor and each preset/generated theme sample.

## PERFORMANCE (hard requirement from the owner)
- Typing in the editor never janks: input latency under 50ms (INP "good" < 200ms worst case) even for a 3-page resume; the preview updates without re-rendering/re-measuring untouched sections (memoized per section, incremental pagination re-measure from the first changed block).
- Live preview update within ~100ms of a keystroke (debounce/transition allowed; editor input itself stays synchronous).
- Initial load: LCP < 2s on mid-range mobile/4G; initial JS budget ~150KB gzip for the editor shell. Heavy things are lazy-loaded: PDF library (if any), color-extraction code, bespoke theme presets, fonts per theme.
- Brand fetch + theme derivation off the main thread where costly (Web Worker for logo palette extraction), cached (IndexedDB) so switching target company is instant the second time.
- Autosave debounced and off the critical path; storage writes never block typing.
- State shape must allow fine-grained subscriptions (selectors), not one giant context that re-renders everything.
- Measure it: a perf budget check in CI (bundle size) and a simple interaction benchmark.

## ICONS (owner request, like FlowCV)
- Icons next to contact fields (email, phone, location, LinkedIn, GitHub, website) and optionally section headings / skill or item bullets; user can toggle icons on/off and pick an icon style per resume.
- One tree-shakable icon set (e.g. Lucide) behind a single icon registry; only used icons ship. Brand/social glyphs (LinkedIn, GitHub) via a small curated set. Themes can recolor icons from theme tokens.
- Accessibility: icons decorative (aria-hidden) when a text label is present; in PDF they must not break reading order or text extraction.

## CLARIFICATION (owner)
Light theme applies ONLY to the builder website UI. The resume preview/PDF ALWAYS takes its colors from the target company's logo palette (no fixed light/dark resume). Text on every logo-derived color must be readable: WCAG AA contrast enforced at theme derivation (adjust lightness / pick on-color automatically), never raw brand colors behind text.
