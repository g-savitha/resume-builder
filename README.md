# Resume builder

Write your resume once, then theme it for every company you apply to. Name the company (or paste its URL), and the app derives a theme from its logo colors, with WCAG AA contrast enforced at derivation. The preview is the PDF: export prints the same DOM.

Status: **milestone 2** (contrast core). Milestone 1 shipped the core model and editor; milestone 2 adds `derivePalette`, which turns a logo palette into WCAG AA-safe theme colors, property-tested over 10,000 random palettes. The themed, paginated preview and PDF export arrive in milestone 3; logo extraction in milestone 4. The design lives in [`docs/design/`](docs/design/); deviations from it are listed in [`docs/design/deviations.md`](docs/design/deviations.md).

## Principles

- **Local-first, static.** No accounts, no backend in v1. Resumes autosave to IndexedDB in your browser. The only server code is `api/brand.ts`, a stateless logo proxy (Vercel Function) that resolves a company to its domain and favicon. Sign-in and cross-device sync are planned for milestone 8, after v1, and stay offline-first.
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

## Add a section kind

Create one folder. The folder name is the kind; nothing else to edit.

```ts
// src/sections/publications/section.ts
import { defineSection, entry, f } from '../kit';

export default defineSection({
  defaultLabel: 'Publications',
  defaultIcon: 'fileText',
  cardinality: 'many',
  shape: 'entries',
  item: { title: f.text('Title', { required: true }), venue: f.text('Venue'), dates: f.dateRange('Date'), url: f.url('Link') },
  project: (it) => entry({ title: it.title, subtitle: it.venue, dates: it.dates, url: it.url }),
});
```

The registry (`import.meta.glob`) picks it up, the editor generates its form from the field specs, and `sections/registry.test.ts` checks it.

## Modules

| Module | Owns |
| --- | --- |
| `domain/` | Resume model, the `Command` union, pure idempotent `applyCommand`, `resolveView`, boundary parsers |
| `sections/` | One folder per section kind, discovered by glob; field specs and projections to the 4 content shapes |
| `icons/` | The single Lucide-backed icon registry (`IconName` is derived from it) |
| `store/` | Zustand store behind per-field selector hooks; the only writer of documents |
| `storage/` | IndexedDB persistence: versioned records, valibot parsing, debounced idle autosave that skips unchanged revisions |
| `brand/` | `lookupBrand` (lazy chunk): company → logo (via `api/brand`) → extracted palette, cached per company in IndexedDB; plus the name-hash fallback |
| `themes/` | Theme as data. Milestone 2: `themes/color`, where `ensureContrast` is the only minter of `ContrastSafe` colors and `derivePalette` the only minter of `AccessiblePalette` |
| `editor/` | The light builder UI: generated forms, accessible reorder (dnd-kit keyboard sensor + Move up/down), hide/show per variant |
| `app/` | Composition root and first-run sample content |

## Layout

| Path | What lives there |
| --- | --- |
| `src/<module>/index.ts` | The only public entry of each module |
| `scripts/eslint/` | The module-boundary lint rule and the architecture map it enforces |
| `api/` | Vercel Functions (`api/brand.ts`, the logo proxy). `vite dev`/`preview` mount the same handler |
| `e2e/` | Playwright tests and the typing benchmark |
| `docs/design/` | Design docs: overview, rationale, module map, type contract |
