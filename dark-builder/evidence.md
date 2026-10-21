# Dark builder UI — evidence
Commit: 6934876 on feat/dark-builder (based on main 605de09)

## pnpm check
 Test Files  20 passed (20)
      Tests  162 passed (162)
  Size limit: 150 kB
  Size:       105.16 kB gzipped
  Size limit: 15 kB
  Size:       3.57 kB gzipped
exit 0

## pnpm e2e
  ✓  1 [e2e] › e2e/editor.spec.ts:6:3 › builder (milestone 1) › main editor renders, dark by default (392ms)
  ✓  2 [e2e] › e2e/editor.spec.ts:15:5 › builder (milestone 1) › passes axe (WCAG 2.2 A/AA, including color contrast) in a real browser, dark builder (1.7s)
  ✓  3 [e2e] › e2e/editor.spec.ts:15:5 › builder (milestone 1) › passes axe (WCAG 2.2 A/AA, including color contrast) in a real browser, light builder (1.7s)
  ✓  4 [e2e] › e2e/editor.spec.ts:27:3 › builder (milestone 1) › the light builder theme survives a reload (427ms)
  ✓  5 [e2e] › e2e/editor.spec.ts:39:3 › builder (milestone 1) › reorders sections with the keyboard (dnd-kit keyboard sensor) and announces politely (439ms)
  ✓  6 [e2e] › e2e/editor.spec.ts:63:3 › builder (milestone 1) › Move up/down buttons keep focus on the moved row (293ms)
  ✓  7 [e2e] › e2e/editor.spec.ts:71:3 › builder (milestone 1) › autosaves to IndexedDB and restores after a reload (2.3s)
  7 passed (9.9s)

## Verify skill (launch, doctor, 6 journeys, cleanup)
```
Serving http://127.0.0.1:5211 (pid 297458, log /tmp/verify-resume-builder-5211/server.log).
url=http://127.0.0.1:5211 pid=297458 rev=605de09+dirty
PASS open the builder; the resume loads and the save status settles
VERIFIED ready. Evidence: /tmp/verify-resume-builder-5211/doctor
PASS press it again; back to dark
VERIFIED ui-theme. Evidence: /workspace/rb-work/e2e/.artifacts/verify/2026-10-21T02-20-44-983Z-ui-theme
PASS Add section > Volunteering: it lands last in the list and opens in the editor
VERIFIED edit-content. Evidence: /workspace/rb-work/e2e/.artifacts/verify/2026-10-21T02-20-46-442Z-edit-content
PASS the preview echo follows the new order
VERIFIED reorder-sections. Evidence: /workspace/rb-work/e2e/.artifacts/verify/2026-10-21T02-20-47-933Z-reorder-sections
PASS switch to the General variant: Projects is still visible there
VERIFIED hide-show. Evidence: /workspace/rb-work/e2e/.artifacts/verify/2026-10-21T02-20-49-258Z-hide-show
PASS delete Experian (two-step confirm): two variants remain
VERIFIED variants. Evidence: /workspace/rb-work/e2e/.artifacts/verify/2026-10-21T02-20-50-479Z-variants
PASS reload: both edits come back from IndexedDB
VERIFIED autosave. Evidence: /workspace/rb-work/e2e/.artifacts/verify/2026-10-21T02-20-51-795Z-autosave
Stopped. Evidence kept in /workspace/rb-work/e2e/.artifacts/verify/.
```

## Mutations (one at a time)
| Mutant | Result |
| --- | --- |
| hard-coded color outside the tokens | caught (1 tests failed) |
| light theme missing a token | caught (1 tests failed) |
| choice not stored | caught (1 tests failed) |
| toggle never leaves dark | caught (1 tests failed) |
