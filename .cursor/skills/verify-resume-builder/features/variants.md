# Variants

A variant is one target company: same content, its own hide/show choices and its own logo-derived theme ([brand pipeline](brand.md)). Users create a variant by naming the company, switch between variants, and delete ones they no longer need.

## Sub-features

- `variant-create` creates a variant from "Company you’re applying to" with "Create variant". It copies the current variant's hide/show and becomes active.
- `variant-switch` switches via the radio in the "Active variant" group or the top-bar select "Variant (target company)".
- `variant-delete` deletes via "Delete <label> variant" and then the "Delete" button in "Confirm deleting <label> variant". Only offered while more than one variant exists.

## How to get to it (user POV)

- The Variants tab, through a click or ArrowRight from the Content tab.
- The top-bar select, for switching only.

## Driving it with Playwright

Preconditions:

- Doctor passes. Fresh profile: variants General and Microsoft, with Microsoft active.

- **Open.** Choose the "Variants" tab. The "Active variant" group has 2 radios and Microsoft is checked.
- **Create.** Fill "Company you’re applying to" with `Experian` and choose "Create variant". The Experian radio is checked, the top-bar select shows "Experian variant", and `live-region` reads "Created and switched to the Experian variant.", then, once the row leaves `data-brand-state="looking-up"`, the logo lookup's result ("Applied the Experian logo colors." or "…keeps a placeholder palette.")
- **Delete.** Choose "Delete Experian variant", then "Delete" in the "Confirm deleting Experian variant" group. 2 radios remain and `live-region` reads "Deleted the Experian variant."
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs variants` saves `variant-created.png` and `variants-panel.aria.yml`.

## Gotchas

- "Create variant" is disabled until the company field has non-blank text.
- Creating a variant starts a logo lookup, which announces after the "Created and switched" message. Wait for the row's `data-brand-state` to leave `looking-up` before asserting the live region. Colors are verified in [brand.md](brand.md).
- Top-bar option labels end in " variant" ("Microsoft variant"), but radio labels start with the company name.
