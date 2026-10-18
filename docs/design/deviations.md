# Deviations from the design contract (milestone 1)

`docs/design/types.ts` is the contract. Each place where milestone 1 differs from it, or from `module-map.md`, is listed here with the reason. Nothing else was changed on purpose.

## Module placement and arrows

1. **Brand and theme data types live in `domain/brand.ts`.** `BrandProfile`, `BrandSnapshot`, `LogoPalette`, `Swatch`, `Oklch`, `Domain`, `SwatchPick`, `RoleChoice`, `ThemeBaseRef`, `ArchetypeId`, `DataUrl`, `Brand`, `Result`. The contract files them under `brand/` and `themes/`, but `Variant` (domain) embeds them and domain is the leaf every module imports. `brand/` and `themes/` will re-export them when they grow.
2. **`CONTACT_ICON` lives in `sections/`, not `icons/`.** `ContactKind` is a domain type; putting the map in `icons/` would make icons import domain while domain imports `IconName` from icons (a cycle). Identity owns contacts, so the map sits with the sections. Domain also exports a runtime `CONTACT_KINDS` list (storage validation, editor select); `ContactKind` is derived from it.
3. **Arrows not drawn in the module map:** `domain → icons` (type only, for `Section.custom.icon: IconName`), `editor → sections` (forms are generated from `FieldSpec`s), `editor → brand` (new variants use the name-hash fallback until M4). A `testing/` module holds shared fixtures and is importable only from `*.test.ts(x)` (lint-enforced). All arrows are declared in `scripts/eslint/architecture.js`.
4. **dependency-cruiser is replaced by a local ESLint rule** (`scripts/eslint/module-boundaries.js`, rule `boundaries/module-imports`) plus `scripts/eslint/architecture.test.ts` (every `src/` folder declared, each has `index.ts`, graph acyclic). One less dependency, and the rule also enforces package ownership (`lucide-react` only in `icons/`, `zustand` only in `store/`, `idb`/`valibot` only in `storage/`, dnd-kit only in `editor/`). TS `paths` maps `@/*` to `src/*/index.ts`, and the Vite alias does the same, so a deep import does not even resolve.
5. **The preview placeholder lives in `editor/preview/`**, not `render/ResumePreview`. `render/` starts in milestone 3 with the engine. The placeholder is a plain, read-only echo of the active variant's visible content.

## Signatures

6. **`startPersistence(options)`** takes `{ store, createInitial, dbName?, debounceMs?, now? }` and resolves to `{ issues, flush(), stop() }` instead of `() => void`. Injecting the store and the first-run document keeps storage free of app knowledge and testable against fake-indexeddb; `flush` serves pagehide and tests; `issues` reports unreadable records (left untouched on disk). Web Locks tab ownership is deferred to milestone 7.
7. **Store surface.** The contract hooks exist (`useDispatch`, `useItemField`, `useSectionOrder`, `useVariantView`, `useAnnounce`, `useResumeList`). Added: `createEditorStore` (opaque handle) and `EditorStoreProvider`, plus narrow selector hooks the editor needs (`useSection`, `useVariant`, `useVariantOrder`, `useActiveVariantId`, `useActiveVariantSummary`, `useIsHidden`, `useItemExists`, `useResumeName`, `useAnnouncement`, `useSaveState`, `useGetDocument`, `useActiveResumeId`). `useVariantView` returns `null` before load. The Web Lock check on dispatch is milestone 7.
8. **`SectionDef.project` and `jsonResume.from/to` use method syntax.** Function-typed properties are contravariant under `strictFunctionTypes`, so a concrete `SectionDef<{ role: … }>` could not be stored in `ReadonlyMap<SectionKind, SectionDef>`. Method syntax keeps the same call shape. Also added: optional `titleField` (names an entry in lists and announcements) and optional `placeholder` on text-like `FieldSpec`s.
9. **`Icon` props:** `style` is optional (defaults to `'line'`) and a `size` prop exists (defaults to `1em`). The registry adds builder-UI icons (grip, eye, chevrons, trash, …) and section default icons (`user`, `fileText`, `badgeCheck`, `layers`); `IconName` is still `keyof typeof iconRegistry`. LinkedIn, GitHub and X glyphs are small hand-drawn line icons, because Lucide 1.x no longer ships brand marks.
10. **Brand helper:** uses the contract's `unique symbol` brand, not the `__brand` string field suggested by the TypeScript skill, to match `types.ts` exactly.
11. **Added to domain:** `createDocument`, `checkInvariants`, `normalizeDocument` (repairs dangling ids at the storage boundary; property tests use `checkInvariants`), boundary parsers (`parsePartialDate`, `parseSafeUrl`, `parseDataUrl`, `parseDomain`), and the rich-text text format (`parseRichText`, `formatRichText`, `richTextToPlain`).

## Behavior

12. **`ResumeView.title` is `"<resume name> – <variant label>"`.** Domain does not know which section kind is the identity, so it cannot produce `"Name – Resume – Company"`. Milestone 3's render layer, which knows the projection, will compose the PDF title.
13. **`variant/create` sets `roles` to strategy defaults** (`ground: 'ground', accent: 'most-chromatic'`) because preset `roleHints` need `themes/` (milestone 3+). It does not auto-select; the editor dispatches `variant/select` next. With `copyFrom`, the new variant copies `customization` and `hidden`.
14. **Every M1 variant uses the name-hash fallback palette** (`brand.fallbackProfile`), labeled "placeholder palette" in the UI. `lookupBrand` and logo palettes are milestone 4.
15. **Custom sections offer only the `entries` shape** in M1 (`Section.custom.shape` is stored). The other shapes need the theme engine to be meaningful.
16. **Tag levels (`withLevel`) are not editable yet.** Levels already stored are preserved through edits by name.
17. **Rich text is edited as a small text syntax** (`- ` bullets, `**bold**`, `*italic*`, `[label](url)`) parsed at the editor boundary into the closed `RichText` AST. No HTML enters the domain; unsafe link targets stay plain text. A WYSIWYG editor can replace the textarea later without touching the domain.
18. **dnd-kit's built-in live region is assertive and not configurable**, so its announcements are silenced and every reorder message goes through the editor's single polite region.

## Tooling versions

19. **TypeScript 6.0, ESLint 9.** TypeScript 7 is current, but typescript-eslint supports `<6.1` and eslint-plugin-jsx-a11y does not yet declare ESLint 10 support.
20. **CI workflow lives at `docs/ci/ci.yml`.** The token used to push cannot write `.github/workflows/`. Moving it to `.github/workflows/ci.yml` is a manual step.
