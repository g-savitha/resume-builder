---
name: verify-resume-builder
description: Launch, drive and prove behavior of the resume builder web app (Vite + React editor at /) with Playwright, capturing screenshots and accessibility snapshots as evidence. Use before claiming any user-facing change in src/ works, to reproduce a reported editor bug, or when asked to verify, demo or screenshot the builder.
---

# Verify the resume builder

The app is a single-page editor: a Content / Variants / Design tab panel on the left and a read-only preview echo on the right. Data lives only in the browser (IndexedDB), so there is no backend, auth or database to start. Every drive gets a fresh browser profile, which means the app seeds its sample resume ("My resume", variants General and Microsoft, Microsoft active).

Read [`features/README.md`](features/README.md) first, then the feature file you are verifying. Helpers live in `scripts/`; run them from the repo root.

## Launch

```sh
.cursor/skills/verify-resume-builder/scripts/launch.sh
```

- Starts the Vite dev server on `http://127.0.0.1:5199` (`VERIFY_PORT` overrides) in its own process group, logging to `/tmp/verify-resume-builder-<port>/server.log`.
- Installs dependencies first if `node_modules` is missing. Needs Node 22 and pnpm (`corepack enable`).
- Ready means usable: it waits for the HTML, then runs Doctor, whose browser check waits for the Sections card and a settled save status.
- Refuses to start when the port already answers. Never drive a server this run did not start; pick another `VERIFY_PORT` instead.
- Two runs side by side: give each its own `VERIFY_PORT`. Browser state never collides, because each drive uses a fresh profile.

## Doctor

```sh
.cursor/skills/verify-resume-builder/scripts/doctor.sh
```

Read-only. Checks that our pid is alive, that the port belongs to our process group, and that the server runs from this checkout. It prints `url`, `pid` and `rev` (`+dirty` when the tree has uncommitted changes, which is what you are verifying). It then loads the app in a headless browser (journey `ready`). Run it first whenever anything looks off.

## Drive

```sh
node .cursor/skills/verify-resume-builder/scripts/drive.mjs <journey> [--headed] [--out <dir>]
```

- `<journey>` is a file in `scripts/journeys/` (`edit-content`, `reorder-sections`, `hide-show`, `variants`, `autosave`, `ready`) or a path to your own `.mjs`.
- A journey default-exports `async ({ page, step, evidence, expect }) => {}`. `page` is a Playwright page with `baseURL` set (so use `page.goto('/')`), and `expect` is Playwright's auto-retrying `expect`.
- Wrap each user action and its expected result in `step('what the user does; what they see', fn)`.
- Any console error or page error fails the run.
- To verify something new, copy the nearest journey into `/tmp`, edit it, and run it by path. If it covers a mapped feature, add it to `scripts/journeys/` and to that feature file.

Driving rules:

- Select by role and accessible name (`getByRole('button', { name: 'Add entry' })`, `getByLabel('Role (required)')`), then the data hooks listed in `features/README.md`, then `data-testid` (`content-echo`, `live-region`). Never select by CSS class, and wait on a state hook rather than a fixed sleep.
- Wait for a visible end state with `expect(...)`, never a fixed sleep: the live-region message, the save status `data-state`, the echo text. The one exception is documented in `features/reorder-sections.md`.
- Prefer the keyboard paths that users rely on (reorder via the drag handle, tabs via arrow keys) over pointer coordinates.
- The preview pane is a placeholder echo in this milestone. Assert content there, not styling.

## Evidence

Each drive writes to `e2e/.artifacts/verify/<UTC timestamp>-<journey>/` (git-ignored):

- `steps.log` lists PASS/FAIL per step, and `report.json` records the journey, url, git rev, step timings and console errors.
- `<name>.png` is a screenshot from `evidence.shot(name)`, and `<name>.aria.yml` is an accessibility snapshot from `evidence.aria(name, locator?)`.
- On failure, `failure.png` shows the screen at the failing step.

Proof standards:

- Drive the real user path: real clicks and keys in the real app, never store setters or test-only hooks.
- Capture the action and the resulting state. For a mutation, also read it back from a second view: the preview echo, another variant, or a reload (persistence lives in IndexedDB).
- Report what you ran and what you saw. That means the command, the `VERIFIED`/`NOT VERIFIED` line, the evidence directory and the screenshots that show the end state. Never "should work".
- A feature with several entry points (the keyboard drag handle and the Move buttons, say) is verified only for the paths you drove. Say which ones.

## Cleanup

```sh
.cursor/skills/verify-resume-builder/scripts/cleanup.sh
```

Stops only the process group recorded in `/tmp/verify-resume-builder-<port>/server.pid` and deletes that run directory. Evidence under `e2e/.artifacts/verify/` is kept. Run it after every attempt, including failed ones, so no server or port is stranded. Never kill by process name: other agents share this machine.

## When the map is wrong

If a journey fails because the app changed on purpose, update the journey and the feature file in the same change. The map is the maintained source of truth for how to drive the app. Use `/maintain-verification-skill` to keep it honest as features land.
