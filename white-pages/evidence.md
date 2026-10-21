# White pages (deviation 46), commit c0532b6 on m3/export-pdf (#19)

- pnpm check: 180 unit tests passed (new property test: every light-mode palette has a #ffffff page and grey raised/sunken), lint 0 warnings, typecheck, build, size 112.93 kB / 4.19 kB.
- Mutant "tinted light page" (page l 0.98 with ground chroma): caught by the new test.
- pnpm e2e: 15 passed. preview.spec asserts the sheet background is rgb(255, 255, 255).
- Verify: preview and export journeys VERIFIED (screenshots here, export.pdf).
- Dark-ground brands unchanged (existing "dark page on black" test still passes).
