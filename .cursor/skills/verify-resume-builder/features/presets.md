# Bespoke presets (M6)

Presets are themes with a little custom chrome. The first is **Streaming (Netflix-style)**: the name sits on a brand-colored title card with a "Featured profile" eyebrow, each role is an "episode" with a big number, and skills are chips. Colors still come only from the variant's logo and the page stays white. A variant on "auto" whose company domain is netflix.com gets it automatically; any variant can pick it in Design → Theme.

## Sub-features

- `preset-pick`: Design → Theme lists the presets after the archetypes (`data-theme-choice="streaming"`). Preview root `data-theme-base="streaming"`.
- `preset-auto`: `themeBase: auto` + brand domain in a preset's manifest `domains` → that preset.
- `preset-bespoke`: the title card (one h1) and episode heads (h3 titles; the number is `[data-decor]`, aria-hidden). Pagination is unchanged: the kit owns the atoms.
- `preset-axe`: axe (WCAG 2.2 AA) passes for every theme × the fixture brands white-ground, near-black, neon, pastel, grey-only (`e2e/presets.spec.ts`).

## How to get to it (user POV)

- Design tab → "Theme for the … variant" → "Streaming (Netflix-style)".
- Or create a variant for "Netflix" (it is themed automatically).

## Driving it with Playwright

- `getByTestId('theme-picker').getByRole('radio', { name: /^Streaming/ }).check()`, wait for settled, check `getByText('Featured profile')` in the preview and one h1.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs presets` saves `presets-streaming.png`.

## Gotchas

- A preset folder is `src/themes/presets/<id>/` with `manifest.ts` and `preset.ts`; the id is the folder name (a unit test checks both files exist and that no preset has a color literal).
- Bespoke components can only redraw the identity's inside and an entry's header line (`BespokeBlocks` in primitives).
