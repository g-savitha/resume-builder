# Brand pipeline

A variant's resume colors come from the target company's logo. Naming a company (or its website) looks up its logo through `/api/brand`, extracts the brand colors in the browser, and re-themes that variant: accent fill and brand-colored text change, the page stays pure white. The logo is cached per company in IndexedDB, so the same company is not fetched again. When no logo can be found the variant keeps the name-hash placeholder palette.

## Sub-features

- `brand-lookup` runs after "Create variant", and once on first run for the seeded Microsoft variant. The row's `data-brand-state` goes `looking-up` → `logo` or `placeholder`, and the row shows a logo thumbnail and "logo palette (<domain>)".
- `brand-fallback`: an unknown company or an unreachable service leaves the placeholder palette, with a live-region message saying which.
- `brand-cache`: a second lookup of the same company (any case, or after a reload) makes no `/api/brand` request.

## How to get to it (user POV)

- Variants tab → "Company you’re applying to" → "Create variant". A website works too (`microsoft.com`).
- First visit: nothing to do; the seeded Microsoft variant picks up its colors by itself.

## Driving it with Playwright

Preconditions:

- Doctor passes. The dev server mounts the real `api/brand.ts`, so the journey needs internet (Clearbit autocomplete for name → domain, Google's favicon service, DuckDuckGo as a second source).

- **Seed.** Open Variants. Wait for the Microsoft row's `data-brand-state="logo"` (allow 15 s for the network). The sheet's `[data-surface="page"]` background is `rgb(255, 255, 255)`; `[data-surface="accent"]` (the name banner) is a Microsoft color.
- **Create.** Create `Google`. Wait for its row to leave `looking-up`; it reads `logo`, `live-region` reads "Applied the Google logo colors.", the accent background changes, the page stays white.
- **Fallback.** Create `Qwzx Widgets Ltd`. Row `placeholder`; `live-region` reads "No logo found for Qwzx Widgets Ltd, so the variant keeps a placeholder palette."
- **Cache.** Reload, create `microsoft`: `logo` state, and no request to `/api/brand`.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs brand` saves `brand-microsoft.png`, `brand-google.png`, `brand-fallback.png` and `variants-panel.aria.yml`.

## Gotchas

- Wait on `data-brand-state`, never on a sleep: lookups take 0.3–3 s on the real network.
- Offline or behind a proxy, every company falls back (`placeholder`, "Couldn’t reach the logo service…"). That is the fallback path working, not a logo-path pass: report the logo steps as not verified.
- e2e (`e2e/brand.spec.ts`) stubs `/api/brand` (`stubBrandApi` in `e2e/helpers.ts`) and every other e2e test gets a not-found stub from `openEditor`, so CI never touches the real services. Use the journey for the real ones.
- Colors are picked by `derivePalette`'s `most-chromatic` strategy, so a multi-color logo (Microsoft, Google) gets its most saturated color as the accent, not necessarily the one people associate with the brand.
