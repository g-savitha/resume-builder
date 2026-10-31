# Multi-colour brand

Design → Customize → **Multi-colour brand** (off by default, per variant) draws every distinct color of the company's logo, not just the accent: a segmented strip under the name, section rules that cycle through the colors, and, where the theme has them, card edges, the side column's inner edge and Streaming's episode numbers. It works for any logo, found or uploaded: the colors come from the logo pixels (domain `brandColors`: chromatic clusters only, no near-white, near-black, grey wordmark or anti-alias blends, largest area first, at most 6). Text never changes: headings and links keep their contrast-safe colors, rules and edges are solved to 3:1 against their surface, the strip is pure decoration, and the page stays white. A one-color logo gives a one-color strip; a black or grey logo uses the variant's accent.

## Sub-features

- `multicolor-toggle`: the "Multi-colour brand" checkbox in `getByTestId('customize-card')`; stored as `customization.multiColor: true` (absent when off), saved and restored per variant.
- `multicolor-strip`: the identity header's `::after` is a hard-stop gradient with one equal segment per logo color (`--brand-strip`). Blocks carry `data-multicolor="<count>"`.
- `multicolor-rules`: each section's heading rule (`[data-block-chrome]`) is 2 px in the next color (`--fg-mark` → `--fg-mark-<k>`), contrast-solved for that surface.
- `multicolor-columns`: Sidebar and App UI draw a vertical strip on the side band's inner edge (`[data-band]::after`, `--brand-strip-v`); App UI's entry cards cycle their edge color.
- `multicolor-streaming`: Streaming's episode numbers cycle through the colors (large decorative text, ≥ 3:1).
- `multicolor-ats`: **ATS plain ignores it** (no `data-multicolor`): that theme exists for applicant-tracking parsers, and decoration adds nothing for them.

## How to get to it (user POV)

- Design tab → Customize card → tick "Multi-colour brand". Works in the editor preview, on `/preview` and in Export PDF (same DOM, backgrounds print).

## Driving it with Playwright

- **Toggle.** `getByTestId('customize-card').getByLabel(/^Multi-colour brand/).check()`, then wait for `data-pagination-state="settled"`.
- **Strip colors.** `getComputedStyle(identityHeader, '::after').backgroundImage` lists every color as `rgb(r, g, b)`; for the 4-square fixture all four appear.
- **Rules.** `[data-page="1"] [data-block-chrome]` → `borderBottomColor` differs between neighbouring sections.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs multicolor` saves `multicolor-on.png` and `multicolor-sidebar.png`; `e2e/multicolor.spec.ts` covers every theme, axe, persistence and the one-color case.

## Gotchas

- Equal-area colors (like a 2×2 grid) have no defined order; assert the set, not the order.
- The strip and the 2 px rules change heights, so the option is part of the theme's `styleHash` (the measure cache re-measures).
- The seeded Microsoft variant gets its real logo only when `/api/brand` finds it; offline it keeps the one-color placeholder, so the strip has one color. Upload a logo for a deterministic run.
