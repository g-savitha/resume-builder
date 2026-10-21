# M3 slice 4: resolveTheme + archetypes — evidence
Commit: 4d779f9 on m3/resolve-theme (stacked on m3/primitives, #14)
Node v22.23.3, pnpm 10.34.6

## pnpm check
 Test Files  19 passed (19)
      Tests  159 passed (159)
  Size limit: 150 kB
  Size:       104.69 kB gzipped
  Size limit: 15 kB
  Size:       3.23 kB gzipped
exit 0

## pnpm e2e
  ✓  1 [e2e] › e2e/editor.spec.ts:6:3 › builder (milestone 1) › main editor renders and matches the light builder chrome (382ms)
  ✓  2 [e2e] › e2e/editor.spec.ts:13:3 › builder (milestone 1) › passes axe (WCAG 2.2 A/AA, including color contrast) in a real browser (1.6s)
  ✓  3 [e2e] › e2e/editor.spec.ts:22:3 › builder (milestone 1) › reorders sections with the keyboard (dnd-kit keyboard sensor) and announces politely (418ms)
  ✓  4 [e2e] › e2e/editor.spec.ts:46:3 › builder (milestone 1) › Move up/down buttons keep focus on the moved row (297ms)
  ✓  5 [e2e] › e2e/editor.spec.ts:54:3 › builder (milestone 1) › autosaves to IndexedDB and restores after a reload (1.7s)
  5 passed (7.0s)

## Mutations (one at a time; mutate.sh)
| Mutant | Result |
| --- | --- |
| colors included in styleHash | caught (1 tests failed) |
| fontScale ignored | caught (2 tests failed) |
| lineHeight not in styleHash | caught (1 tests failed) |
| key ignores colors | caught (1 tests failed) |
| explicit archetype ignored | caught (2 tests failed) |
| accent surface colors not emitted | caught (1 tests failed) |
| CSS reads a variable no theme sets | caught (1 tests failed) |

## Not verified here
No UI uses the theme yet. How the two archetypes actually look (fonts, banner contrast in a real browser, axe) is checked with ResumePreview in slice 5.
