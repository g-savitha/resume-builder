# Brand pipeline

A variant's resume colors come from the target company's logo. Naming a company (or its website) looks up its logo through `/api/brand`, extracts the brand colors in the browser, and re-themes that variant: accent fill and brand-colored text change, the page stays pure white. The logo is cached per company in IndexedDB, so the same company is not fetched again. When no logo can be found the variant keeps the name-hash placeholder palette.

## Sub-features

- `brand-lookup` runs after "Create variant", and once on first run for the seeded Microsoft variant. The row's `data-brand-state` goes `looking-up` → `logo` or `placeholder`, and the row shows a logo thumbnail and "logo palette (<domain>)".
- `brand-fallback`: an unknown company or an unreachable service leaves the placeholder palette, with a live-region message saying which.
- `brand-upload`: Design tab → "Logo" card → "Upload a logo for <variant>" (PNG, SVG or JPG, ≤ 2 MB). It replaces the fetched logo for that company, in this variant and in later ones. A file that is not really an image is refused with an inline error (`aria-invalid` on the input) and the variant is unchanged.
- `brand-choice`: a name with no exact match and several suggestions applies the first one and shows a "Which <name>?" card (`data-testid="company-choice"`) in the Variants tab: radios per candidate (name and domain), "Use this company" re-looks the variant up by that domain, "Keep <first>" closes it.
- `brand-remove-upload`: Design → Logo shows "Remove uploaded logo" only for an uploaded logo (the hint reads "Colors come from your uploaded logo."). It goes back to the fetched logo, or the placeholder.
- `brand-cache`: a second lookup of the same company (any case, or after a reload) makes no `/api/brand` request.

## How to get to it (user POV)

- Variants tab → "Company you’re applying to" → "Create variant". A website works too (`microsoft.com`).
- First visit: nothing to do; the seeded Microsoft variant picks up its colors by itself.
- Design tab → "Logo" card, for an upload.

## Driving it with Playwright

Preconditions:

- Doctor passes. The dev server mounts the real `api/brand.ts`, so the journey needs internet (Clearbit autocomplete for name → domain, Google's favicon service, DuckDuckGo as a second source).

- **Seed.** Open Variants. Wait for the Microsoft row's `data-brand-state="logo"` (allow 15 s for the network). The sheet's `[data-surface="page"]` background is `rgb(255, 255, 255)`; `[data-surface="accent"]` (the name banner) is a Microsoft color.
- **Create.** Create `Google`. Wait for its row to leave `looking-up`; it reads `logo`, the live region says "Applied the Google logo colors.", the accent background changes, the page stays white.
- **Fallback.** Create `Qwzx Widgets Ltd`. Row `placeholder`; the live region says "No logo found for Qwzx Widgets Ltd, so the variant keeps a placeholder palette. You can upload one in Design."
- **Cache.** Reload, create `microsoft`: `logo` state, and no request to `/api/brand`.
- **Upload.** Design tab, `setInputFiles` on "Upload a logo for microsoft" with an SVG buffer (a `#107c10` square). The live region log gets "Applied your uploaded logo to the microsoft variant.", the "Current logo for microsoft" image is a PNG data URL, and the accent background is `rgb(16, 124, 16)` on a white page.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs brand` saves `brand-microsoft.png`, `brand-google.png`, `brand-fallback.png`, `brand-upload.png` and `variants-panel.aria.yml`.

## Gotchas

- The live region holds one message and autosave replaces it quickly ("All changes saved…"). Assert on the row state, the inline error or the announcement log (`announcements` in `e2e/helpers.ts`), not on the region's current text.
- An upload is cached for that company in this browser for good; a fresh profile (every drive) starts clean.
- Wait on `data-brand-state`, never on a sleep: lookups take 0.3–3 s on the real network.
- Offline or behind a proxy, every company falls back (`placeholder`, "Couldn’t reach the logo service…"). That is the fallback path working, not a logo-path pass: report the logo steps as not verified.
- e2e (`e2e/brand.spec.ts`) stubs `/api/brand` (`stubBrandApi` in `e2e/helpers.ts`) and every other e2e test gets a not-found stub from `openEditor`, so CI never touches the real services. Use the journey for the real ones.
- Colors are picked by `derivePalette`'s `most-chromatic` strategy, so a multi-color logo (Microsoft, Google) gets its most saturated color as the accent, not necessarily the one people associate with the brand. The user can pick another one in Design → Colors (`swatches.md`).
