# Module map (synthesized)

**Import rules.**
- Each module under `src/` exports only through its `index.ts`. TS `paths` exposes only `@/<module>`, and ESLint `no-restricted-imports` (generated from the folder listing) blocks `@/<module>/**`, so a deep import of internals fails the build. dependency-cruiser enforces the arrows in CI.
- Nobody outside `icons/` may import `lucide-react`. Nobody outside `themes/color` may call `ensureContrast`.

```
app ──► editor ──► store ──► domain ◄── sections
 │        │                     ▲
 │        └► brand (lazy) ──────┤ (domain types only)
 │        └► themes (listThemeChoices, for the picker)
 └──────► render ──► engine ──► domain
            │  └───► themes ──► primitives, icons
            └──────► primitives ──► icons
storage ──► store, domain          io (lazy) ──► domain, sections
api/brand (edge, separate deploy) ── HTTP only ── brand
```

| Module | Owns (single source of truth) | Public surface | Unreachable from outside |
|---|---|---|---|
| `domain/` | Normalized `ResumeDocument`, `Variant` (pinned `BrandSnapshot`, roles, customization, `hidden`), ids, the RichText AST, the 4 content shapes, `FieldValue`, the `Command` union, `applyCommand` (pure, idempotent), `resolveView` | types, `applyCommand`, `resolveView`, `newId` | per-command helpers |
| `sections/` | Every section kind, once. One folder per kind (`<kind>/section.ts`). Kind = folder name, via `import.meta.glob(..., {eager:true})` | `defineSection`, `f`, `rich` (kit), `sectionRegistry` | per-kind folders |
| `icons/` | The one icon registry (per-icon Lucide imports plus curated brand glyphs) | `Icon`, `IconName` (= `keyof typeof iconRegistry`), `CONTACT_ICON`, `PICKABLE_ICONS` | the registry object |
| `brand/` *(lazy)* | `CompanyQuery → BrandProfile`: normalization, the IndexedDB brand cache (SWR), edge client, wire parsing, palette worker, upload path, fallbacks | `lookupBrand` | `BrandWireV1`, cache schema, worker protocol, proxy URL |
| `api/brand` *(edge fn)* | Site head/manifest scrape, logo choice, CORS byte proxy, optional brand-search key, allow-list and size limits, `s-maxage` | `GET /api/brand?domain=…\|name=…` | keys, everything |
| `themes/` | Theme as data: archetypes (`ats-plain`, `classic`, `sidebar`, `app-ui`), presets (eager `manifest.ts` glob + lazy `preset.ts` glob, both keyed by folder), and `themes/color` (`ensureContrast`, the sole minter of `ContrastSafe`; `derivePalette`, the sole minter of `AccessiblePalette`; `SURFACE_FOREGROUNDS` policy) | `resolveTheme(variant)`, `listThemeChoices(brand)`, `definePreset`, `definePresetManifest`, `ResolvedTheme`/`Surface` types | OKLCH math, `ensureContrast`, `derivePalette` (exported to `*.test.ts` only), glob maps, auto-pick heuristic |
| `primitives/` | The closed set of block variants per shape, plus `Heading` (no level), `Text`, `OnSurface`, `Decor`, `Atom`, `RichTextView`. Owns semantics (h1–h3, ul/li, a href), `data-atom`, and the no-outer-margin rule | the components, the `BespokeBlock` contract | CSS modules |
| `engine/` | The page-box model: flows from `LayoutSpec` (reading order), `Measurer` (offscreen, hash cache, font readiness), pure `paginate` with keep-with-next/orphan/widow, incremental restart plus convergence | `layoutDocument`, `PagedLayout` types (imported by `render/` only; lint-restricted) | paginate internals, atom rules |
| `render/` | Screen and print composition: `ResumePreview` (deferred view → `resolveTheme` → `layoutDocument` → memoized `PageBox`/`Fragment` views), `printVariant` (title, lang, `@page`, fonts ready, `print()`) | `ResumePreview`, `printVariant` | `PagedDocument`, `FragmentView`, the DOM measurer instance |
| `store/` | Live editor state (Zustand, normalized); the only writer of documents; Web Lock check on dispatch; live-region announcer | `useDispatch`, `useItemField`, `useSectionOrder`, `useVariantView`, `useAnnounce`, `useResumeList` | the raw store |
| `storage/` | IndexedDB `resumes` (one record per resume including variants), versioned migrations, rev-guarded idle autosave, Web Locks tab ownership | `startPersistence` | record types, migrations |
| `io/` *(lazy)* | Native envelope plus the JSON Resume adapter, built from each `SectionDef.jsonResume`, with valibot parsing | `importFile`, `exportResume` | wire schemas |
| `editor/` | Light-themed builder UI: forms generated from `FieldSpec`, dnd-kit plus keyboard sensor plus Move up/down (same `item/move`/`section/move`), company dialog, swatch picker, customization panel | route components | everything |
| `app/` | Routes, lazy boundaries, size-limit config, CSP | `main.tsx` | n/a |

## Traces (at most 3 files each)

- **Keystroke.**
  1. `editor` field calls `dispatch(item/set)`.
  2. `domain.applyCommand` replaces one item, and only `useItemField` subscribers re-render (synchronous).
  3. `render/ResumePreview` reads `useDeferredValue(view)`.
  4. Projection memo misses for one item only, so the measurer re-measures one block.
  5. `engine.layoutDocument` restarts at that page and usually converges after one page.
- **New target company.**
  1. `editor` CompanyDialog calls `brand.lookupBrand`, which goes to cache, then edge, then worker.
  2. `dispatch(variant/create)` pins the snapshot.
  3. `themes.resolveTheme` runs `derivePalette`.
- **Switch variant.** `variant/select` makes `resolveTheme` run from the pinned snapshot (no fetch). `styleHash` changes, causing one full re-measure, which is benchmark-gated under 100 ms for 3 pages.
- **Export.** `render.printVariant` prints the same `PagedDocument` DOM, and Chromium produces the tagged PDF.

## Derived lists (no hand-synced registries)

| List | Derived from | Build-failing check |
|---|---|---|
| Section kinds | `sections/*/section.ts` glob; kind = folder name | every folder default-exports `defineSection` |
| Presets | `themes/presets/*/manifest.ts` (eager) and `preset.ts` (lazy), same folder key; id = folder name | a folder missing either file fails |
| Kinds referenced by presets (placement, vocab, iconOverrides) | `sectionRegistry` | test: every referenced kind exists |
| Icon names | `keyof typeof iconRegistry` | an unknown name is a type error |
| Contrast policy | `SURFACE_FOREGROUNDS` → `Surface` type and the solver loop | property test over 10k palettes |
| JSON Resume adapter | each `SectionDef.jsonResume` | round-trip test per kind |
| axe fixtures | archetypes × presets × fixture brands | axe-core run in CI |
| Restricted-import lint rule | `src/*` folder listing | n/a |
