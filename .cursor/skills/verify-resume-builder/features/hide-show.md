# Hide and show per variant

Each variant (target company) has its own hide/show state for sections and entries. Hiding something in one variant removes it from that variant's preview only. Content itself is shared.

## Sub-features

- `hide-section` toggles "Hide <section> in <variant>" (aria-pressed) on a section row.
- `hide-entry` does the same per entry in the section editor.
- `hide-scope` means a node hidden in one variant stays visible in the others.

## How to get to it (user POV)

- Content tab: the eye button on each section row and each entry header. Its accessible name always reads "Hide <name> in <variant>". Its state is `aria-pressed`.
- The active variant is the top-bar select "Variant (target company)" or the Variants tab.

## Driving it with Playwright

Preconditions:

- Doctor passes. Fresh profile: Microsoft is active and Projects is visible.

- **Hide.** Choose "Hide Projects in Microsoft". It has `aria-pressed="true"`, the row's name button reads "Projects · hidden here", and the echo has no level 3 heading "Projects".
- **Other variant.** Select "General variant" in "Variant (target company)". "Hide Projects in General" has `aria-pressed="false"` and the echo shows "Projects" again.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs hide-show` saves `hidden-in-microsoft.png` and `visible-in-general.png`.

## Gotchas

- The eye button's name does not change with state. Assert `aria-pressed`, not the label.
- Hiding every section shows "Everything is hidden in this variant." in the echo, which is a valid state.
