# Resume builder verification map

This directory is the maintained source for verifying the builder's user-facing behavior. Read this index before driving the app, then use the matching feature file as the recipe. Each feature has a runnable journey in `../scripts/journeys/`.

## Baseline preconditions

- Launch with `scripts/launch.sh`. `scripts/doctor.sh` must print our `url`, `pid` and `rev` and end with `VERIFIED ready`.
- Each drive starts from a fresh browser profile with the seeded sample resume: "My resume", 8 sections in the order Profile, Summary, Experience, Projects, Skills, Certifications, Education, Languages (Experience has 3 entries), and variants General and Microsoft, with Microsoft active.
- Never drive an instance this run did not start.

## Driving conventions

- Prefer roles and accessible names, then the data hooks below, then `data-testid`. Do not select by CSS class.
- Wait on a state hook, never a fixed sleep:

  | Hook | Where | Values |
  | --- | --- | --- |
  | `data-app-state` | app root | `loading`, `ready` (the saved or seeded resume has loaded) |
  | `data-component="save-status"` + `data-state` | top bar | `idle`, `saving`, `saved`, `error` |
  | `data-drag-state` | every reorderable list | `idle`, `dragging` (arrow keys move the lifted row) |
  | `data-row-label` | section and entry rows | the row's current label |
  | `data-item-body` | entry bodies | the entry id; `hidden` when collapsed |
  | `data-ui-theme` | `<html>` | `dark` (default), `light` (builder chrome only) |
  | `data-component="resume-preview"` + `data-pagination-state` | preview root | `measuring`, `settled` (every block measured, pages final) |
  | `data-page-count` | preview root | pages in the current layout |
  | `data-theme-base` | preview root | the archetype drawn: `classic` (default), `ats-plain` |
  | `data-page` | each page sheet | 1-based page number |
  | `data-brand-state` | each variant row (Variants tab) | `looking-up`, `logo` (logo-derived palette), `placeholder` (name-hash fallback) |
  | `data-surface` | resume blocks | `page`, `raised`, `sunken`, `accent`; read its computed `background-color` to check theme colors |
- Wait for a visible end state with `expect`: a live-region message (`data-testid="live-region"`, polite), the save status, or the preview (`data-testid="resume-preview"`, settled when `[data-pagination-state="settled"]`).
- Treat quoted names literally. The curly apostrophe in "Company you’re applying to" is part of the label.
- Restore nothing by hand: the next drive gets a fresh profile.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- Read every mutation back from a second view: the preview, another variant, or a reload.
- Report the journey, the `VERIFIED` line and the evidence directory. Report an unreachable path with the attempted command and the unmet precondition. Do not report an entry point you skipped as verified through a different one.

## Feature entry contract

Each feature file starts with an H1 and one paragraph on the user-visible behavior, then four H2s in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with Playwright`, `Gotchas`.

## Features

- [Edit content](./edit-content.md) covers choosing a section, editing fields, adding entries and adding sections, as seen in the preview.
- [Reorder sections](./reorder-sections.md) covers keyboard drag and drop, Move up/down, and the announcements.
- [Hide and show per variant](./hide-show.md) covers the per-variant eye toggle for sections and entries.
- [Variants](./variants.md) covers creating, switching and deleting target-company variants.
- [Brand pipeline](./brand.md) covers the logo lookup, its per-company cache and the placeholder fallback.
- [Autosave and restore](./autosave.md) covers the save status and persistence across a reload.
- [Resume preview](./preview.md) covers the paginated pages, the "(continued)" heading on a split section, and the Design-tab theme picker.
- [Export PDF](./export.md) covers printing the preview to a tagged PDF with the same pages, title and language.
- [Builder UI theme](./ui-theme.md) covers the dark default, the "Light theme" toggle and its persistence.
- [Flows](./flows.md) covers the end-to-end "tailor a resume for a company" journey across features.
