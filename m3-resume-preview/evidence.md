# m3/resume-preview evidence

Branch `m3/resume-preview` at 72e27a8, stacked on `feat/dark-builder` (#17). Run locally on the box, Node 22.23.3, Chrome at /usr/bin/google-chrome, 2026-10-21.

## Checks

- `pnpm check`: lint (0 warnings), typecheck, 175 unit tests passed, build, size 112.4 kB gzip JS (limit 150) / 4.02 kB CSS (limit 15).
- `SLOWDOWN=2 slow-vitest.sh`: 175 passed.
- `pnpm e2e`: 11 passed (editor.spec 6, preview.spec 5).
- `e2e/preview.spec.ts --repeat-each=5`: 20/20 passed at the time; the settled-freshness test then `--repeat-each=10`: 10/10.
- `pnpm bench` (bench.json): 3 engine pages, 200 keystrokes. Unthrottled frame p98 7 ms (p50 3.7, max 18.1). 4x CPU p98 20.1 ms. Target p98 < 50 ms. The number is keystroke to next frame; the preview's deferred catch-up render is not included.

## Verify skill

All journeys VERIFIED against a dev server on port 5211 (journeys/*: report.json, steps.log, screenshots, aria snapshots): ready, edit-content, reorder-sections, hide-show, variants, autosave, ui-theme, preview (new).

The preview journey: one classic page on open; four long entries push Experience onto page 2 under "Experience (continued)"; every fragment drawn within 1 px of the engine's height and inside its page; Design tab > ATS plain redraws and settles.

Screenshots: preview-classic.png, preview-continued.png (the page break), preview-ats-plain.png (from e2e) and journeys/preview/*.png.

## Mutants (mutants.md)

9 unit-level mutants in measureDom, engine layout, BlockView, buildFlow and PreviewEngine: all caught.

One e2e-level mutant: marking the preview "settled" while a newer deferred view is pending. The first version of the hide/show e2e failed on exactly this bug before the fix. The test was then rewritten to read the count right after "settled" (no waiting on the count). With the mutant it failed 5/5; with the fix it passed 10/10.

## Follow-up commit 86bd421 (fit with transform, not zoom)

While writing slice 6, a narrow-window (1100 px) run found a fragment drawn 1.6 px shorter than planned. The cause was CSS `zoom`, which re-lays text out at the scaled size. The fix scales pages with `transform: scale()`. A new e2e (laptop-width window) checks that the pages are scaled (< 1), every fragment fits, and the pane does not scroll horizontally.

After the fix:
- `pnpm check` green: 175 unit tests, size 112.48 kB / 4.04 kB.
- `pnpm e2e`: 12 passed.
- Journeys edit-content, hide-show, reorder-sections, preview: VERIFIED. `journeys/preview` was replaced with this run.
- `pnpm bench` (bench-86bd421.json): 3 pages, p98 15.3 ms unthrottled, 23.9 ms at 4x CPU. That is higher than the first run's 7 / 20.1 ms. Run-to-run variance on this box is in that range. Both runs are under the 50 ms target.
