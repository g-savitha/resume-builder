# M3 slice 2: incremental, convergent relayout — evidence
Commit: 8465f9b on m3/engine-incremental (stacked on m3/engine-paginate, #12)
Node v22.23.3, pnpm 10.34.6

## pnpm check
 Test Files  16 passed (16)
      Tests  143 passed (143)
  Size limit: 150 kB
  Size:       104.69 kB gzipped
  Size limit: 15 kB
  Size:       3.23 kB gzipped
exit 0

## pnpm e2e
  ✓  1 [e2e] › e2e/editor.spec.ts:6:3 › builder (milestone 1) › main editor renders and matches the light builder chrome (392ms)
  ✓  2 [e2e] › e2e/editor.spec.ts:13:3 › builder (milestone 1) › passes axe (WCAG 2.2 A/AA, including color contrast) in a real browser (1.5s)
  ✓  3 [e2e] › e2e/editor.spec.ts:22:3 › builder (milestone 1) › reorders sections with the keyboard (dnd-kit keyboard sensor) and announces politely (411ms)
  ✓  4 [e2e] › e2e/editor.spec.ts:46:3 › builder (milestone 1) › Move up/down buttons keep focus on the moved row (279ms)
  ✓  5 [e2e] › e2e/editor.spec.ts:54:3 › builder (milestone 1) › autosaves to IndexedDB and restores after a reload (1.7s)
  5 passed (7.0s)

## Incremental tests at ~3x slowdown (SLOWDOWN=2)
 ✓ src/engine/incremental.test.ts > incremental relayout > re-lays only the pages around an edit that keeps the height, and reuses the rest by identity 11ms
 ✓ src/engine/incremental.test.ts > incremental relayout > moves an edited block up when it shrinks enough to fit after the previous block 1ms
 ✓ src/engine/incremental.test.ts > incremental relayout > returns the previous pages when nothing changed 0ms
 ✓ src/engine/incremental.test.ts > incremental relayout > lays out from scratch when the style hash changes 0ms
 ✓ src/engine/incremental.test.ts > incremental relayout properties > after any sequence of edits, equals a layout from scratch 290ms
 ✓ src/engine/incremental.test.ts > incremental relayout properties > never re-measures a block on a page before the edit 68ms

## Mutations of src/engine/layout.ts (one at a time; mutate.sh)
| Mutant | Result |
| --- | --- |
| restart at the edited block's page, not the previous block's | caught (3 tests failed) |
| reuse the tail even if a later block changed | caught (2 tests failed) |
| ignore style hash / page size / rules | caught (1 tests failed) |
| never reuse the old tail | caught (2 tests failed) |
| reuse one page too many before the edit | caught (3 tests failed) |
| match page starts by block only, not atom | caught (1 tests failed) |
| check convergence only after a split | caught (2 tests failed) |
