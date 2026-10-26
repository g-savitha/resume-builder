# Swatch picker

The Design tab's "Colors" card lets the user choose which of the variant's logo colors the resume uses: one for the accent (name banner and headings) and, optionally, one for the secondary role (rules and the banner's links). Microsoft's logo has four colors and the automatic pick is the most saturated one (its orange-red); picking blue makes the banner and headings Microsoft blue. The page stays pure white, there is no background choice. Every pick still goes through `ensureContrast`, so when a swatch is too light to read on white the card says what it was changed to.

## Sub-features

- `swatch-accent`: radio group "Accent color for the <variant> variant (name banner and headings)". Options: "Automatic" (the default, `most-chromatic`) and one radio per logo swatch, named "<color name> <hex>" (for example "blue #00a4ef"). A pick stores the swatch's index in `variant.roles.accent` (`variant/setRoles`).
- `swatch-secondary`: radio group "Secondary color for the <variant> variant (rules and banner links)". "None" (the default: rules follow the accent) or a swatch.
- `swatch-contrast-note`: when a picked swatch had to be darkened or lightened, `data-testid="contrast-note-accent"` (or `-secondary`) reads "Adjusted for contrast: the banner uses #… and headings #… instead of #…." It is also the group's accessible description and part of the live-region announcement.
- `swatch-reset`: "Reset to automatic" puts both roles back (accent automatic, no secondary). Disabled when they already are.
- `swatch-persist`: picks are part of the variant, so autosave keeps them across a reload. A new logo (lookup or upload) resets numeric picks to automatic, because the indices would point at different colors; after an upload the Logo card shows `data-testid="picks-reset-note"` ("Your color picks were reset to automatic, because the new logo has different colors.").
- Placeholder palette: the card shows "Find or upload a logo to pick which of its colors the <variant> resume uses." and no radios.

## How to get to it (user POV)

- Design tab → "Colors" card, below "Logo". The active variant needs a logo palette (fetched or uploaded).

## Driving it with Playwright

Preconditions:

- Doctor passes. The journey uses the seeded Microsoft variant's real logo, so it needs internet (see `brand.md`). Offline, upload a multi-color SVG in the "Logo" card first, as `e2e/swatches.spec.ts` does.

- **Wait for the logo.** Variants tab, Microsoft row `data-brand-state="logo"`, then the Design tab.
- **Pick.** `getByRole('group', { name: /^Accent color for the Microsoft variant/ }).getByRole('radio', { name: /^blue #/ }).check()`. The live region log gets "Accent color set to blue (#…) for the Microsoft variant." and the sheet's `[data-surface="accent"]` background turns blue (blue channel well above red) on a `rgb(255, 255, 255)` page.
- **Note.** `contrast-note-accent` is visible when the swatch was adjusted (Microsoft's `#00a4ef` is under 3:1 on white, so it always is).
- **Persist.** Wait for the save status `saved`, reload, the blue radio is still checked and the accent color is unchanged.
- **Reset.** "Reset to automatic": "Automatic" is checked and the accent is back to the automatic color.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs swatches` saves `swatch-picker.png`, `swatch-microsoft-blue.png` and `swatch-picker.aria.yml`.

## Gotchas

- Option order follows the palette (heaviest swatch first) and the hex comes from the extracted logo, so match radios by color name (`/^blue #/`), not by position or an exact hex.
- Arrow keys move the pick within a group (native radios), and each move is a `variant/setRoles` plus an announcement.
- Ground swatches are never offered (logo palettes have none, deviation 50), and the picker cannot change the page color.
