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
- Wait for a visible end state with `expect`: a live-region message (`data-testid="live-region"`, polite), the save status, or the preview echo (`data-testid="content-echo"`).
- Treat quoted names literally. The curly apostrophe in "Company you’re applying to" is part of the label.
- Restore nothing by hand: the next drive gets a fresh profile.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- Read every mutation back from a second view: the preview echo, another variant, or a reload.
- Report the journey, the `VERIFIED` line and the evidence directory. Report an unreachable path with the attempted command and the unmet precondition. Do not report an entry point you skipped as verified through a different one.

## Feature entry contract

Each feature file starts with an H1 and one paragraph on the user-visible behavior, then four H2s in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with Playwright`, `Gotchas`.

## Features

- [Edit content](./edit-content.md) covers choosing a section, editing fields, adding entries and adding sections, as seen in the preview echo.
- [Reorder sections](./reorder-sections.md) covers keyboard drag and drop, Move up/down, and the announcements.
- [Hide and show per variant](./hide-show.md) covers the per-variant eye toggle for sections and entries.
- [Variants](./variants.md) covers creating, switching and deleting target-company variants.
- [Autosave and restore](./autosave.md) covers the save status and persistence across a reload.
- [Flows](./flows.md) covers the end-to-end "tailor a resume for a company" journey across features.
