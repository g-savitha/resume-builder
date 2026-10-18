# Resume builder

Write your resume once, then theme it for every company you apply to. Name the company (or paste its URL), and the app derives a theme from its logo colors, with WCAG AA contrast enforced at derivation. The preview is the PDF: export prints the same DOM.

Status: milestone 1 (core model and editor) in progress. The design lives in [`docs/design/`](docs/design/).

## Principles

- **Local-first, static.** No accounts, no backend in v1. Resumes autosave to IndexedDB in your browser.
- **Accessible.** The builder targets WCAG 2.2 AA: full keyboard operation (including reorder), visible focus, labeled fields, live announcements. Generated resume themes must pass AA contrast by construction.
- **Fast.** Typing stays under 50 ms per keystroke; the initial editor shell stays under 150 KB gzip. Both are checked by scripts, not by hope.
- **Agent-friendly structure.** Every folder in `src/` is a module imported only through its `index.ts` (`@/<module>`), along the arrows in `scripts/eslint/architecture.js`. Lint fails on deep imports or undeclared arrows. Lists such as section kinds are derived from folders, never hand-synced.

## Develop

Requires Node 22 and pnpm (`corepack enable`).

```sh
pnpm install
pnpm dev          # http://localhost:5173
pnpm check        # typecheck + lint + unit/axe tests + build + size budget
pnpm e2e          # Playwright end-to-end tests (needs a Chrome/Chromium)
pnpm bench        # Playwright typing-latency benchmark
```

Playwright uses `CHROME_PATH` or `/usr/bin/google-chrome` when present; otherwise run `pnpm exec playwright install chromium` once.

## Layout

| Path | What lives there |
| --- | --- |
| `src/<module>/index.ts` | The only public entry of each module |
| `scripts/eslint/` | The module-boundary lint rule and the architecture map it enforces |
| `e2e/` | Playwright tests and the typing benchmark |
| `docs/design/` | Design docs: overview, rationale, module map, type contract |
