# Milestone 4 plan: brand pipeline

Goal: a variant's resume colors come from the target company's real logo instead of the name-hash placeholder. The page stays pure white (deviation 46); the brand shows in the accent fill, brand-colored text and (slice 4) section headings, all still minted by `ensureContrast`.

Small stacked PRs, each green on `pnpm check` and `pnpm e2e`.

| # | PR | What it proves |
| --- | --- | --- |
| 1 | **brand: palette extraction from logo pixels** (`extractPalette`) | Pure, DOM-free: RGBA pixels → `LogoPalette` (box cut in OKLab, merge, weights). Transparent pixels and a plain neutral backdrop are ignored; a colored tile is kept. No swatch is a ground, so every logo-themed page is white (deviation 50). Tests on synthetic images plus a property test over random images; a derivePalette property test shows no-ground palettes print on `#ffffff` and pass AA. |
| 2 | **brand: `lookupBrand` with the `/api/brand` logo proxy and a per-company cache** (stacked on 1) | Name or URL → domain → logo → palette, through one boundary. A same-origin Vercel function resolves the domain and proxies the favicon bytes (no key, no CORS). The client validates the wire, decodes the image, extracts the palette and caches the profile per company in IndexedDB, so a company is fetched once. Every failure is a value: the variant keeps `fallbackProfile`. New variants and the seeded Microsoft variant get their logo colors. |
| 3 | **editor: upload your own logo** (stacked on 2) | PNG, SVG or JPG, validated (type, magic bytes, size) at the upload boundary and rasterized to PNG. It overrides the fetched logo for that company, now and for later variants (cached as an upload). |
| 4 | **themes: brand-colored section headings** (independent of 1–3) | Headings start from the accent hue instead of a near-neutral, then go through `ensureContrast` like every other foreground, so AA (and the 7:1 boost) still hold by construction. |
| 5 | **editor: swatch picker** (after 1–4 merged) | Design → Colors: radio groups for the accent and an optional secondary over the logo's swatches, stored as numeric `roles` picks (`variant/setRoles`). No ground choice, so the page stays white. Picks still go through `ensureContrast`; the card says when a pick was adjusted. "Reset to automatic". Persisted with the variant (deviation 58). |

Shipped after the plan (v1 batch): the "Which company?" choice for ambiguous names and "Remove uploaded logo" (deviation 60).

Not in M4 (follow-ups): `showLogo` (drawing the logo on the resume), and a palette Web Worker (deviation 51).

Deviations from `types.ts`, `module-map.md` and `rationale.md` are recorded in `deviations.md` in the PR that makes them.
