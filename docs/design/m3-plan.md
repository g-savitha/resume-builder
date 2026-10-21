# Milestone 3 plan: engine and preview

Small stacked PRs. Each one ends in a state a reviewer can check on its own (green `pnpm check` and `pnpm e2e`), and each says what it proves.

| # | PR | What it proves |
| --- | --- | --- |
| 1 | **engine: pure pagination** (`layoutDocument` from scratch over a `Measurer`) | Atoms flow onto fixed-height pages in order, exactly once. Keep-with-next, keep-together, orphans/widows and the tall-atom overflow rule hold, on hand-computed cases and on random inputs (fake measurer, no DOM). |
| 2 | **engine: incremental + convergent relayout** (graft G2) | Relaying out after an edit equals a from-scratch layout, reuses the pages before the edit by identity, and stops re-paginating once a page start matches the old layout (the old tail is reused by identity). |
| 3 | **primitives: semantic block kit** (`Heading`, `Text`, `OnSurface`, `Decor`, `Atom`, `RichTextView`, the `ats-plain`/`classic` block variants) | Semantics are owned in one place: identity h1, section h2, entry h3 by context; lists are real `ul/li`; links are real; decor is `aria-hidden`; every breakable unit carries `data-atom`; ranges render only their atoms. Unit + axe tests. |
| 4 | **themes: `resolveTheme` with the `ats-plain` and `classic` archetypes** | A variant resolves to colorless theme data + its `AccessiblePalette` as CSS variables, with a `styleHash` that changes exactly when geometry can. |
| 5 | **render: DOM measurer + `ResumePreview`** (replaces the M1 echo). Also: "(continued)" heading on split sections, classic seeded default, a minimal Design-tab theme picker (deviations 44–46) | Real A4/Letter page boxes in the preview. The measurer reads `data-atom` heights offscreen with a `(contentHash, styleHash, width)` cache. Data hooks for agents: `data-pagination-state` (`measuring`/`settled`) and `data-page-count`. Verify journey + feature map entry; e2e drives it; the typing bench runs against the real preview. |
| 6 | **render: `printVariant` + Export PDF** | The PDF has the same page count and page breaks as the preview, real text in reading order, `document.title` and `<html lang>` set. e2e prints with Chromium and checks the PDF. |
| 7 | **spike: tagged PDF from Chromium** | What Chromium actually tags (structure tree, headings, lists, link annotations, artifacts for `aria-hidden` SVG, `/Lang`, `/Title`), checked with a script on a sample export. Findings and limits written up; a decision for Rakendu on the release gate (veraPDF/PAC or not). |

Order: 1 → 2 are pure and need nothing else. 3 and 4 can land in either order. 5 needs 1–4. 6 needs 5. 7 needs 6.

Deviations from `types.ts` and `module-map.md` are recorded in `deviations.md` in the PR that makes them.
