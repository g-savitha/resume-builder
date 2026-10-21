# Export PDF

"Export PDF" in the top bar prints the preview through the browser's print dialog, where "Save as PDF" writes the file. It is the same DOM as the preview, so the PDF has the preview's pages and page breaks. Its text is real and in reading order. Chromium tags it (headings, lists, links). Its Title is "<resume> – <variant>" and its language is the resume's. Only the resume pages print: the builder chrome is hidden in print.

## Sub-features

- `export-print` the button waits for fonts and a settled preview, sets `document.title` and `<html lang>`, then calls `window.print()`. Title and lang come back on `afterprint`.
- `export-pages` print CSS: one sheet per page, at full size (the on-screen fit-to-pane transform is undone), `@page { size: A4|letter; margin: 0 }`, backgrounds kept.
- `export-narrow` below 900 px the preview pane is hidden, but pagination still runs (blocks are measured in a portal on `<body>`), so the export is the same.
- `export-announce` the polite live region says "Preparing the PDF. In the print dialog, choose “Save as PDF”."

## How to get to it (user POV)

- Top bar, right: "Export PDF" (primary button).

## Driving it with Playwright

Preconditions:

- Doctor passes. Chromium (page.pdf is Chromium-only).

- **Stub the dialog.** Replace `window.print` with a function that records `document.title` and `document.documentElement.lang`. The real dialog cannot be driven, and `afterprint` never fires on its own, so the title stays set for the next step.
- **Export.** Click "Export PDF". Poll the recorded values: `{ title: 'My resume – Microsoft', lang: 'en' }`.
- **Print.** `page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true })`. Then run `inspectPdf` / `structureProblems` from `scripts/pdf-structure.ts`. The page count equals `data-page-count`, page 2 starts with "EXPERIENCE (CONTINUED)" (classic uppercases), and there are no structure problems.
- **Restore.** Dispatch `afterprint`. The tab title ends with "Resume builder" again.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs export` saves `export.pdf` and `export.pdf.json`.
- **CLI.** `node scripts/pdf-structure.ts some.pdf --title "My resume – Microsoft" --lang en` prints the report. It exits 1 if there are problems.

## Gotchas

- PDF text is what is drawn, so CSS `text-transform` applies: classic headings read "EXPERIENCE", ATS plain "Experience". Compare against `innerText`, not `textContent`.
- Without `preferCSSPageSize: true`, `page.pdf` uses Letter and ignores the `@page` size.
- `structureProblems` is a smoke check (tagged, H1/H2, Title, Lang, text on each page). It is not PDF/UA validation; veraPDF is the planned release gate.
