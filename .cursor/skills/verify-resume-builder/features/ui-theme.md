# Builder UI theme

The builder is dark by default, whatever the OS prefers. "Light theme" in the top bar switches the builder to light, and the choice is remembered in this browser. Only the builder chrome changes: the preview paper stays white, and resume colors always come from the variant's theme.

## Sub-features

- `theme-default` dark on first visit (`<html data-ui-theme="dark">`).
- `theme-toggle` a toggle button named "Light theme"; `aria-pressed` says whether light is on.
- `theme-persist` the choice survives a reload (localStorage `resume-builder:ui-theme`, applied in `index.html` before the first paint).

## How to get to it (user POV)

- Top bar, between the save status and "Export PDF": the "Light theme" button (moon icon when dark, sun when light).

## Driving it with Playwright

Preconditions:

- Doctor passes. Fresh profile (so no stored choice).

- **Default.** Load `/`. Wait for `[data-app-state="ready"]`. `html` has `data-ui-theme="dark"`; the toggle has `aria-pressed="false"`.
- **Toggle.** Click the button named "Light theme". `html` has `data-ui-theme="light"`, `aria-pressed="true"`.
- **Persist.** Reload, wait for ready. Still `light`, still pressed.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs ui-theme` saves `dark.png` and `light-after-reload.png`.

## Gotchas

- Wait on `html[data-ui-theme]`, not on a color or a CSS class. The attribute is set synchronously on click.
- The button's name never changes ("Light theme"); its state is `aria-pressed`. Do not look for a "Dark theme" button.
- The theme is stored per browser profile; each drive starts dark.
