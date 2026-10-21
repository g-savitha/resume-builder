# Resume preview

The right-hand pane is the resume itself: real A4 (or Letter) pages, laid out by the pagination engine with the variant's theme. It is the DOM the PDF export will print. Edits show up as you type. When a section runs past the bottom of a page, it carries on at the top of the next one under a repeated heading, "Experience (continued)". The bar above the pages names the variant, the theme and the page count. The Design tab picks the theme: Classic (the default for the seeded variants) or ATS plain.

## Sub-features

- `preview-pages` fixed-size page sheets (`[data-page]`), one per engine page; `data-page-count` on the root matches them.
- `preview-settle` `data-pagination-state` is `measuring` while new or edited blocks are measured off-screen, then `settled`.
- `preview-continued` a section split across pages repeats its heading on the next page as "<Heading> (continued)" (a level 2 heading).
- `preview-theme` Design tab > "Theme for the <variant> variant": Classic or ATS plain. `data-theme-base` follows; the choice is per variant.
- `preview-meta` the bar reads "<Variant> · <Theme> theme · <n> page(s)" (`data-testid="preview-meta"`).

## How to get to it (user POV)

- Open the builder: the pages are on the right (hidden below 900 px wide).
- Design tab (third tab on the left) for the theme picker.

## Driving it with Playwright

Preconditions:

- Doctor passes. A viewport at least 900 px wide (drive.mjs uses 1440 × 900).

- **Settled.** Wait for `[data-component="resume-preview"][data-pagination-state="settled"]`. The seeded Microsoft variant is one page, `data-theme-base="classic"`.
- **Grow it.** Choose "Add entry" in Experience a few times and fill "Highlights" with several `- ` lines each. Wait for settled again. `data-page-count` is at least 2, equals the number of `[data-page]` sheets, and page 2 has a level 2 heading named exactly "Experience (continued)".
- **Fits the page.** Every fragment's drawn height is within 1 px of the engine's (`[data-fragment-h]` vs its block's box) and ends inside its page's content box. This is the "what you see is what prints" check.
- **Theme.** Design tab, choose the "ATS plain" radio. Root has `data-theme-base="ats-plain"`, settles, and the meta reads "ATS plain theme".
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs preview` saves `preview-classic.png`, `preview-continued.png`, `preview-ats-plain.png` and `preview-pages.aria.yml`.

## Gotchas

- Wait on `data-pagination-state="settled"`, then read `data-page-count`. Reading it while `measuring` gives the previous layout's count (the old pages stay on screen until the new ones are ready).
- Pages are scaled down to fit the pane with a CSS transform (the factor is `data-scale` on the article's parent). Compare geometry as ratios or inside one page, not against raw A4 pixel sizes.
- Classic uppercases section headings with CSS only. Accessible names and text content keep the typed case ("Experience (continued)").
- A hidden, off-screen copy of new blocks (`[data-measure]`, `aria-hidden`, `inert`) exists only while measuring. Scope queries to `getByTestId('resume-preview')`.
