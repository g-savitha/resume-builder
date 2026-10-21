# m3/export-pdf evidence

Branch `m3/export-pdf` at 86b11e5, stacked on `m3/resume-preview` (#18). Run locally on the box, Node 22.23.3, Chrome at /usr/bin/google-chrome, 2026-10-21.

## Checks

- `pnpm check`: lint (0 warnings), typecheck, 179 unit tests passed, build, size 112.94 kB gzip JS (limit 150) / 4.19 kB CSS (limit 15).
- `pnpm e2e`: 15 passed. New `e2e/export.spec.ts` has 3 tests: classic, ats-plain, and a narrow 800 px window with the pane hidden. With `--repeat-each=5`: 15/15.
- Verify skill: all 9 journeys VERIFIED (journeys/*), including the new `export` (journeys/export/export.pdf and export.pdf.json).

## The PDFs

- export-classic.pdf: 2 pages. export-ats-plain.pdf: 3 pages. Both come from the e2e run and are A4. Page renders: export-*-page-N.png.
- `node scripts/pdf-structure.ts <pdf> --title "My resume – Microsoft" --lang en`: exit 0 for both (export-*.report.json). Both are tagged (MarkInfo Marked true), have H1/H2/H3/L/LI/Link/P roles, Title "My resume – Microsoft" and Lang "en".
- The e2e asserts:
  - the PDF page count equals the preview's `data-page-count`
  - each preview page's headings appear on the same PDF page, in order
  - a page's first heading is not on the page before
  - page 1 starts with the name

## Mutants (e2e, each restored afterwards)

| Mutant | Result |
| --- | --- |
| no `@page` rule | caught (2 failed) |
| builder chrome not hidden in print | caught (2 failed) |
| `document.title` not set | caught (2 failed) |
| fit-to-pane transform kept in print (1100 px window) | caught (2 failed) |
| measure area not portaled (narrow window) | caught (1 failed) |

Unit: `src/render/print.test.ts`:
- title and lang are set at print time and restored on afterprint
- waits for settled
- rejects (no print) when the preview never settles

`EditorApp.test.tsx`: Export PDF calls print with the right title and announces "Save as PDF".

## Not covered

- The real print dialog: it cannot be automated, so window.print is stubbed and `page.pdf` stands in for "Save as PDF". Both use Chromium's print path with print media.
- Firefox and Safari print output.
- PDF/UA validation (veraPDF), planned as a release gate.
