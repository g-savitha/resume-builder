# Edit content

The Content tab lists the resume's sections. Choosing one opens it in the section editor below the list. Its fields are generated per section kind, and every edit appears immediately in the preview echo on the right.

## Sub-features

- `content-select` opens a section in the section editor (heading level 2 with the section name and entry count).
- `content-edit` changes a field and shows the change in the preview echo.
- `content-add-entry` adds an entry to a multi-entry section and focuses its first field.
- `content-add-section` adds a section kind at the end of the list and opens it.
- `content-rename` overrides the section title via "Section title".
- `content-delete` deletes an entry or section through a two-step confirm.

## How to get to it (user POV)

- Content tab (the default tab). The first multi-entry section (Experience) is open on load.
- Choose a section name in the "Sections, in resume order" list.
- Use the "Add section" button in the Sections card header, then a kind in the "Section types" list.
- Use the "Add entry" button under a section's entries.

## Driving it with Playwright

Preconditions:

- Doctor passes. Fresh profile (seeded resume).

- **Open.** Load `/`. The section editor (`#section-editor`) shows a heading starting with `Experience`.
- **Edit.** Fill `getByLabel('Role (required)').first()` with a new value. `content-echo` contains it.
- **Add entry.** Count the items in `getByRole('list', { name: 'Experience entries' })`, then choose "Add entry". There is one more item, the heading shows the new count, and the new entry's "Role (required)" field has focus. Typed text appears in the echo.
- **Add section.** Choose "Add section", then the "Volunteering" button in `getByRole('list', { name: 'Section types' })`. The last section-list row reads Volunteering and the editor heading starts with Volunteering.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs edit-content` saves `edit-content.png` and `preview-echo.aria.yml`.

## Gotchas

- Single-instance kinds already present (Profile, Summary, ...) are omitted from "Section types". Pick a kind the seed lacks: Volunteering, Achievements or Custom section.
- Entry bodies are collapsed except the one you open. Scope field lookups to the open body: `[data-item-body]:not([hidden])`.
- Section and entry rows carry their current label in `data-row-label`.
- Rich-text fields ("Highlights", "Summary") take a small text syntax: `- ` bullets, `**bold**`, `*italic*`, `[label](url)`.
