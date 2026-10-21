# Autosave and restore

Every change autosaves to IndexedDB in the browser after a short idle debounce. The top bar shows the save status. Reloading the page restores the last saved resume, including per-variant hide/show.

## Sub-features

- `save-status` cycles through "Saving…" and "Saved locally" ("Not saved" on error).
- `save-restore` restores content and hide/show after a reload.

## How to get to it (user POV)

- It's automatic. The status sits in the top bar, left of "Export PDF".

## Driving it with Playwright

Preconditions:

- Doctor passes. Fresh profile.

- **Settle.** Load `/`. `[data-app-state="ready"]` is present and `[data-component="save-status"]` has `data-state` `idle` or `saved`.
- **Change.** Fill the first "Role (required)" with `Principal Frontend Engineer` and choose "Hide Projects in Microsoft". Within 5 s the save status reaches `data-state="saved"` with the text "Saved locally".
- **Restore.** Reload. The first "Role (required)" has the new value, "Hide Projects in Microsoft" has `aria-pressed="true"`, and the preview contains the new role.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs autosave` saves `saved.png` and `restored-after-reload.png`.

## Gotchas

- `idle` and `saved` render the same text ("Saved locally"). Wait for `data-state="saved"` after a change, not for the text, or you may read the pre-change state.
- `idle` is also the state before the resume has loaded. Wait for `[data-app-state="ready"]` first.
- Saving is debounced and runs on idle. Never reload before `data-state="saved"`, or the change can be lost (correctly).
- Data is per browser profile. A new drive never sees a previous drive's edits.
