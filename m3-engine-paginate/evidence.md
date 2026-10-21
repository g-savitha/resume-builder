# M3 slice 1: engine pagination — evidence
Commit: 7cae98c on m3/engine-paginate (based on origin/main 8b13842)
Node v22.23.3, pnpm 10.34.6

## pnpm check
 Test Files  15 passed (15)
      Tests  137 passed (137)
✓ built in 408ms
  Size limit: 150 kB
  Size:       104.69 kB gzipped
  Size limit: 15 kB
  Size:       3.23 kB gzipped
exit 0

## pnpm e2e
  ✓  1 [e2e] › e2e/editor.spec.ts:6:3 › builder (milestone 1) › main editor renders and matches the light builder chrome (433ms)
  ✓  2 [e2e] › e2e/editor.spec.ts:13:3 › builder (milestone 1) › passes axe (WCAG 2.2 A/AA, including color contrast) in a real browser (1.6s)
  ✓  3 [e2e] › e2e/editor.spec.ts:22:3 › builder (milestone 1) › reorders sections with the keyboard (dnd-kit keyboard sensor) and announces politely (418ms)
  ✓  4 [e2e] › e2e/editor.spec.ts:46:3 › builder (milestone 1) › Move up/down buttons keep focus on the moved row (285ms)
  ✓  5 [e2e] › e2e/editor.spec.ts:54:3 › builder (milestone 1) › autosaves to IndexedDB and restores after a reload (1.7s)
  5 passed (7.1s)

## Engine tests under CI-like slowdown (SLOWDOWN=2, ~3x; .cursor/skills/ci-only-test-timeouts)
Test Files 1 passed, Tests 18 passed, Duration 2.53s (whole run incl. jsdom env setup)

## Mutations of src/engine/layout.ts (script: mutate.sh; each mutant applied alone, file restored after)
| Mutant | Result |
| --- | --- |
| ignore keep-with-next | caught (2 tests failed) |
| ignore keep-together | caught (2 tests failed) |
| ignore orphans | caught (2 tests failed) |
| ignore widows | caught (1 tests failed) |
| top chrome on every fragment | caught (1 tests failed) |
| bottom chrome on every fragment | caught (1 tests failed) |
| no overflow flag | caught (2 tests failed) |
| first fit instead of longest | caught (4 tests failed) |
| heading-only fragment allowed | caught (run failed or hung, exit 1) |
| gap carried to next page | caught (2 tests failed) |
