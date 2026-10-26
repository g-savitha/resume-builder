# Multi-column themes and Customize (M5)

Two more archetypes, **Sidebar** (name, contacts, skills, certifications and education in a full-height brand-colored column on the left) and **App UI** (rounded brand header, entries as cards with a brand stripe, skills as chips in a grey rail on the right). Each column is paginated on its own, so a long Experience column flows to page 2 while the side column stays put; the side fill runs top to bottom on every page. The page itself stays pure white. Design → **Customize** sets the variant's font, text size, line and section spacing, page size (A4 / US Letter), margins, icons (contact, section heading, brand-colored bullets; line or badge style) and an extra-high 7:1 text contrast option.

## Sub-features

- `archetype-sidebar`: Design → Theme → "Sidebar". Preview root `data-theme-base="sidebar"`, `data-layout="columns"`; each sheet has `[data-band="left"]` and `[data-region="side"]` / `[data-region="main"]`.
- `archetype-app-ui`: "App UI". `[data-band="right"]`; Skills render as a list of chips in the side region; Experience entries have a left brand stripe.
- `columns-paginate`: adding entries makes the main column flow onto page 2; every page keeps its band; fragments fit their pages.
- `customize-type`: Font (Theme default, Serif, Sans, System UI, Humanist), Text size, Line spacing, Section spacing.
- `customize-page`: Page size and Margins re-paginate the preview.
- `customize-icons`: Contact icons (on by default), Section heading icons, Brand-colored bullets, Icon style (line / badge). Icons carry `data-icon="<name>"`.
- `customize-boost`: "Extra-high text contrast (7:1)" stores `roles.boost = 1`; body text targets 7:1 where the surface allows.

## How to get to it (user POV)

- Design tab → "Theme for the … variant" radios → Sidebar or App UI.
- Design tab → "Customize" card (below Company persona).

## Driving it with Playwright

- **Theme.** `getByTestId('theme-picker').getByLabel(/^Sidebar/).check()`, then wait for `data-pagination-state="settled"`.
- **Columns.** `[data-page="1"] [data-region="side"]` holds the h1 (Sidebar) and the "Skills" h2.
- **Customize.** In `getByTestId('customize-card')`: `getByLabel('Font', { exact: true }).selectOption({ label: 'Serif (Georgia)' })`, `getByLabel('Page size').selectOption('Letter')`, `getByLabel('Section heading icons').check()`, `getByLabel(/Extra-high text contrast/).check()`. Read back after a reload.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs customize` saves `customize-sidebar.png`, `customize-app-ui.png` and `customize-icons.png`.

## Gotchas

- The archetype's own font for Classic is already Georgia; compare `--rs-font` against its starting value, not against a font name.
- Theme default font is stored as "no fontPair" (`variant/customize` with `fontPair: null`).
- Each column has its own measuring area (`[data-measure-region]`), portaled to `<body>` while blocks are missing.
