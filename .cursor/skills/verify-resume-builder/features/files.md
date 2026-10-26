# Files, duplicate, tabs and the preview route (M7)

The top bar's **File** button opens a small panel. It can duplicate the open resume, export it, and import a file as a new resume. There are two export formats: "Export JSON (all variants)" is our own format (`*.resume-builder.json`), with every variant, brand and setting. "Export JSON Resume" is the standard jsonresume.org format (`*.json-resume.json`), with content only. "Import JSON…" accepts either format. Once there is more than one resume, a "Resume" picker appears in the top bar. Only one tab edits at a time. A second tab shows "Your resume is open in another tab" and its "Use this tab instead" button. On a phone, "Preview only" (`/preview`) shows just the resume, scaled to fit, with the variant picker and Export PDF.

## Sub-features

- `file-export-native`: a download named `<slug>.resume-builder.json`, `{ format: 'resume-builder', version: 1, doc }`.
- `file-export-json-resume`: a download named `<slug>.json-resume.json` (basics, work, education, projects, skills, languages, certificates, awards, volunteer). Custom sections are listed as "Not included" in the announcement.
- `file-import`: our JSON is validated with storage's schema. JSON Resume is mapped into sections. Anything else gets a `role="alert"` message. An import is always a new resume, with a new id, and is opened.
- `file-duplicate`: "Duplicate resume" adds "<name> (copy)" and opens it.
- `resume-switch`: the `Resume` select in the top bar, shown once there are 2 or more resumes.
- `tab-lock`: Web Locks. The second tab gets `data-testid="tab-guard"`, an alertdialog with the rest of the page inert. "Use this tab instead" reloads and takes the lock, and the first tab is then guarded. Closing the editing tab hands the lock over automatically.
- `preview-route`: `/preview` (`data-route="preview"`). On screens under 900 px the editor shows a "Preview only" link.
- `csp`: production sends the CSP from `vercel.json`. The inline theme script is allowed by its sha256, and `api/_csp.test.ts` keeps the hash in sync with `index.html`.

## How to get to it (user POV)

- Top bar → File.
- Open the app in a second tab.
- On a phone, top bar → Preview only, or go to `/preview`.

## Driving it with Playwright

- `getByRole('button', { name: 'File', exact: true })`. Then, inside `getByTestId('file-menu')`, use the buttons by name. For import, use `getByLabel('Import JSON…').setInputFiles(...)`.
- Downloads: `page.waitForEvent('download')` alongside the click.
- Tabs: open `context.newPage()` on `/` and expect `getByTestId('tab-guard')`.
- CSP: `e2e/io.spec.ts` adds the `vercel.json` header to document responses and asserts there are no `securitypolicyviolation` events and no console errors.
- **Run it.** `node .cursor/skills/verify-resume-builder/scripts/drive.mjs files` saves `files-imported.png` and `files-preview-route.png`.

## Gotchas

- "File" also matches the section rows' "Profile" buttons, so pass `exact: true`.
- Each test's fresh browser context has its own lock. Two pages in one context share it.
- The dev server (`vite`) does not send the CSP. Only Vercel does, and e2e emulates it.
