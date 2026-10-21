# M3 slice 3: primitives block kit — evidence
Commit: 8948a44 on m3/primitives (stacked on m3/engine-incremental, #13)
Node v22.23.3, pnpm 10.34.6

## pnpm check
 Test Files  17 passed (17)
      Tests  151 passed (151)
  Size limit: 150 kB
  Size:       104.69 kB gzipped
  Size limit: 15 kB
  Size:       3.23 kB gzipped
exit 0

## pnpm e2e
  ✓  1 [e2e] › e2e/editor.spec.ts:6:3 › builder (milestone 1) › main editor renders and matches the light builder chrome (371ms)
  ✓  2 [e2e] › e2e/editor.spec.ts:13:3 › builder (milestone 1) › passes axe (WCAG 2.2 A/AA, including color contrast) in a real browser (1.5s)
  ✓  3 [e2e] › e2e/editor.spec.ts:22:3 › builder (milestone 1) › reorders sections with the keyboard (dnd-kit keyboard sensor) and announces politely (416ms)
  ✓  4 [e2e] › e2e/editor.spec.ts:46:3 › builder (milestone 1) › Move up/down buttons keep focus on the moved row (275ms)
  ✓  5 [e2e] › e2e/editor.spec.ts:54:3 › builder (milestone 1) › autosaves to IndexedDB and restores after a reload (1.7s)
  5 passed (6.9s)

## Mutations of src/primitives (one at a time; mutate.sh)
| Mutant | Result |
| --- | --- |
| heading level ignores position (always h2) | caught (2 tests failed) |
| entry header does not keep with its body | caught (1 tests failed) |
| continued fragment repeats the heading | caught (1 tests failed) |
| entry atoms numbered from 0 each entry | caught (2 tests failed) |
| identity not keep-together | caught (1 tests failed) |
| bullets ignore the range | caught (1 tests failed) |
| rich text ignores base | caught (3 tests failed) |
| decor not hidden | caught (1 tests failed) |
| surface reads the page colors everywhere | caught (1 tests failed) |

## Type checks: the contrast policy must cover exactly domain's FOREGROUND_ROLES

### extra role in SURFACE_FOREGROUNDS
src/themes/color/types.ts(24,3): error TS2353: Object literal may only specify known properties, and 'border' does not exist in type 'Record<"icon" | "text" | "muted" | "accentText" | "heading" | "rule", ContrastLevel>'.

### role missing from SURFACE_FOREGROUNDS
src/themes/color/derivePalette.test.ts(27,12): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to index type '{ readonly 'AA-text': 4.5; readonly 'AA-ui': 3; }'.
src/themes/color/derivePalette.test.ts(27,22): error TS7053: Element implicitly has an 'any' type because expression of type '"icon" | "text" | "muted" | "accentText" | "heading" | "rule"' can't be used to index type '{ readonly text: "AA-text"; readonly muted: "AA-text"; readonly accentText: "AA-text"; readonly heading: "AA-text"; readonly icon: "AA-ui"; }'.
  Property 'rule' does not exist on type '{ readonly text: "AA-text"; readonly muted: "AA-text"; readonly accentText: "AA-text"; readonly heading: "AA-text"; readonly icon: "AA-ui"; }'.

## Not verified here
The axe test runs in jsdom, where the CSS variables are unset and layout is not computed, so it checks structure and ARIA, not contrast or geometry. Real-browser axe and the verify journey come with ResumePreview (slice 5), the first time this kit is visible in the app.
