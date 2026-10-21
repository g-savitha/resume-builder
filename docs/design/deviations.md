# Deviations from the design contract

`docs/design/types.ts` is the contract. Each place where an implemented milestone differs from it, or from `module-map.md`, is listed here with the reason. Nothing else was changed on purpose.

## Milestone 1

### Module placement and arrows

1. **Brand and theme data types live in `domain/brand.ts`.** `BrandProfile`, `BrandSnapshot`, `LogoPalette`, `Swatch`, `Oklch`, `Domain`, `SwatchPick`, `RoleChoice`, `ThemeBaseRef`, `ArchetypeId`, `DataUrl`, `Brand`, `Result`. The contract files them under `brand/` and `themes/`, but `Variant` (domain) embeds them and domain is the leaf every module imports. `brand/` and `themes/` will re-export them when they grow.
2. **`CONTACT_ICON` lives in `sections/`, not `icons/`.** `ContactKind` is a domain type; putting the map in `icons/` would make icons import domain while domain imports `IconName` from icons (a cycle). Identity owns contacts, so the map sits with the sections. Domain also exports a runtime `CONTACT_KINDS` list (storage validation, editor select); `ContactKind` is derived from it.
3. **Arrows not drawn in the module map:** `domain → icons` (type only, for `Section.custom.icon: IconName`), `editor → sections` (forms are generated from `FieldSpec`s), `editor → brand` (new variants use the name-hash fallback until M4). A `testing/` module holds shared fixtures and is importable only from `*.test.ts(x)` (lint-enforced). All arrows are declared in `scripts/eslint/architecture.js`.
4. **dependency-cruiser is replaced by a local ESLint rule** (`scripts/eslint/module-boundaries.js`, rule `boundaries/module-imports`) plus `scripts/eslint/architecture.test.ts` (every `src/` folder declared, each has `index.ts`, graph acyclic). One less dependency, and the rule also enforces package ownership (`lucide-react` only in `icons/`, `zustand` only in `store/`, `idb`/`valibot` only in `storage/`, dnd-kit only in `editor/`). TS `paths` maps `@/*` to `src/*/index.ts`, and the Vite alias does the same, so a deep import does not even resolve.
5. **The preview placeholder lives in `editor/preview/`**, not `render/ResumePreview`. `render/` starts in milestone 3 with the engine. The placeholder is a plain, read-only echo of the active variant's visible content.

### Signatures

6. **`startPersistence(options)`** takes `{ store, createInitial, dbName?, debounceMs?, now? }` and resolves to `{ issues, flush(), stop() }` instead of `() => void`. Injecting the store and the first-run document keeps storage free of app knowledge and testable against fake-indexeddb; `flush` serves pagehide and tests; `issues` reports unreadable records (left untouched on disk). Web Locks tab ownership is deferred to milestone 7.
7. **Store surface.** The contract hooks exist (`useDispatch`, `useItemField`, `useSectionOrder`, `useVariantView`, `useAnnounce`, `useResumeList`). Added: `createEditorStore` (opaque handle) and `EditorStoreProvider`, plus narrow selector hooks the editor needs (`useSection`, `useVariant`, `useVariantOrder`, `useActiveVariantId`, `useActiveVariantSummary`, `useIsHidden`, `useItemExists`, `useResumeName`, `useAnnouncement`, `useSaveState`, `useGetDocument`, `useActiveResumeId`). `useVariantView` returns `null` before load. The Web Lock check on dispatch is milestone 7.
8. **`SectionDef.project` and `jsonResume.from/to` use method syntax.** Function-typed properties are contravariant under `strictFunctionTypes`, so a concrete `SectionDef<{ role: … }>` could not be stored in `ReadonlyMap<SectionKind, SectionDef>`. Method syntax keeps the same call shape. Also added: optional `titleField` (names an entry in lists and announcements) and optional `placeholder` on text-like `FieldSpec`s.
9. **`Icon` props:** `style` is optional (defaults to `'line'`) and a `size` prop exists (defaults to `1em`). The registry adds builder-UI icons (grip, eye, chevrons, trash, …) and section default icons (`user`, `fileText`, `badgeCheck`, `layers`); `IconName` is still `keyof typeof iconRegistry`. LinkedIn, GitHub and X glyphs are small hand-drawn line icons, because Lucide 1.x no longer ships brand marks.
10. **Brand helper:** uses the contract's `unique symbol` brand, not the `__brand` string field suggested by the TypeScript skill, to match `types.ts` exactly.
11. **Added to domain:** `createDocument`, `checkInvariants`, `normalizeDocument` (repairs dangling ids at the storage boundary; property tests use `checkInvariants`), boundary parsers (`parsePartialDate`, `parseSafeUrl`, `parseDataUrl`, `parseDomain`), and the rich-text text format (`parseRichText`, `formatRichText`, `richTextToPlain`).

### Behavior

12. **`ResumeView.title` is `"<resume name> – <variant label>"`.** Domain does not know which section kind is the identity, so it cannot produce `"Name – Resume – Company"`. Milestone 3's render layer, which knows the projection, will compose the PDF title.
13. **`variant/create` sets `roles` to strategy defaults** (`ground: 'ground', accent: 'most-chromatic'`) because preset `roleHints` need `themes/` (milestone 3+). It does not auto-select; the editor dispatches `variant/select` next. With `copyFrom`, the new variant copies `customization` and `hidden`.
14. **Every M1 variant uses the name-hash fallback palette** (`brand.fallbackProfile`), labeled "placeholder palette" in the UI. `lookupBrand` and logo palettes are milestone 4.
15. **Custom sections offer only the `entries` shape** in M1 (`Section.custom.shape` is stored). The other shapes need the theme engine to be meaningful.
16. **Tag levels (`withLevel`) are not editable yet.** Levels already stored are preserved through edits by name.
17. **Rich text is edited as a small text syntax** (`- ` bullets, `**bold**`, `*italic*`, `[label](url)`) parsed at the editor boundary into the closed `RichText` AST. No HTML enters the domain; unsafe link targets stay plain text. A WYSIWYG editor can replace the textarea later without touching the domain.
18. **dnd-kit's built-in live region is assertive and not configurable**, so its announcements are silenced and every reorder message goes through the editor's single polite region.

### Tooling versions

19. **TypeScript 6.0, ESLint 9.** TypeScript 7 is current, but typescript-eslint supports `<6.1` and eslint-plugin-jsx-a11y does not yet declare ESLint 10 support.
20. **CI workflow lives at `docs/ci/ci.yml`.** The token used to push cannot write `.github/workflows/`. Moving it to `.github/workflows/ci.yml` is a manual step.

## Milestone 2 (contrast core)

21. **No mid-lightness band for the accent fill.** The contract's TODO pushes the accent swatch out of L (0.45, 0.6) before solving it against the page. That changed brand colors that already worked: Experian-like raspberry `#ba2f7d` became `#990062`, and a red `#e50914` on a dark page became `#ec1b1d`, although both carry AA text. The fill is now the logo color, adjusted only if it is below 3:1 against the page. Its foregrounds are solved against it like any other surface, so text on it passes regardless; in that band the text simply lands near black or white.
22. **No +0.1 safety margin.** Contrast is measured on the exact `#rrggbb` values that render (foreground and background both rounded to 8 bits first), so there is no rounding gap to buffer. A color that already meets its level is returned unchanged; an adjusted one stops at the smallest passing lightness (24-step bisection), so brand colors move only as far as readability needs. The final assert checks the WCAG threshold itself.
23. **`ensureContrast(fg, bg, level, aim?)`.** The optional `aim` asks for a higher ratio when the background allows it. `RoleChoice.boost = 1` aims for 7:1 on `text` and `heading`. 7:1 is best effort: on a mid-tone background (relative luminance near 0.18) nothing exceeds about 4.58:1. The level's minimum always holds.
24. **Swatch picks are total.** A numeric pick beyond this palette falls back to the role's default strategy (`ground` for ground, `most-chromatic` for accent and secondary). The `ground` strategy with no ground swatch (a transparent logo) gives a white page; an empty palette gives a white page and a grey accent. Mode is dark when the ground's OKLCH L is below 0.5. `BrandProfile.siteDark` is not consulted: `derivePalette` takes a `LogoPalette` per the contract, and `resolveTheme` (milestone 3) can map the hint onto `roles`.
25. **Foreground sources.** `text`, `heading` and `muted` start from near-neutrals tinted with the accent hue (no tint when the accent is achromatic, so gray brands stay gray). `accentText` and `icon` start from the accent swatch; `rule` from the secondary swatch, else the accent. On the accent surface, `accentText`/`icon` use the secondary swatch (else the ink pole) and `rule` uses the ink pole.
26. **How the mint is enforced.** `ensureContrast` is not exported from `themes/color/index.ts`, and a lint rule stops the rest of `themes/` from importing `themes/color/*` directly. Casting to `ContrastSafe`, `Surface` or `AccessiblePalette` is a lint error everywhere except the two minting files (`ensureContrast.ts`, `derivePalette.ts`), since a cast is the only way to forge one. `themes/index.ts` exports only the palette types until `resolveTheme` lands in milestone 3; `derivePalette` is reachable inside `themes/` through `./color`.
27. **Added types:** `ForegroundRole` (`keyof typeof SURFACE_FOREGROUNDS`) and `ContrastReportEntry` (the report row). Every emitted color is a lowercase `#rrggbb` string.
28. **Fixture brand palettes live in `testing/`** (`FIXTURE_PALETTES`), so the milestone 6 axe runs can reuse them. They are a test-only minter of `LogoPalette`. No architecture arrow changed: `themes → domain` was already declared.


## Milestone 3 (engine and preview)

The slice plan is in [m3-plan.md](m3-plan.md).

29. **`layoutDocument` takes flow blocks, not a view and a theme.** Its input is `{ blocks, size, styleHash, rules? }` and it is generic over the block type: `layoutDocument<B extends FlowBlock>(input, measurer, prev?)`. The architecture lets `engine` import only `domain`, so it cannot see `ResolvedTheme` (themes) or project sections (sections). `render/`, which may import both, turns the view and theme into blocks; the engine only paginates. `FlowBlock` is just `{ key, contentHash }`; render extends it with shape, style and surface, and gets its own type back in `PagedLayout<B>.blocks`.
30. **`Measurer` has no `ready(theme)`.** Waiting for fonts belongs to render's DOM measurer, which knows the theme. The engine interface is only `measure(block, width)`.
31. **Page model.** `PageBox` has no `index` (a page's number is its array index, so a page object can be reused when pages before it change; see the incremental relayout). `PagedLayout` also records `styleHash` and `rules`, so a later relayout can tell when nothing can be reused. M3 pages have one region, `main`; `header` and `side` arrive with the multi-region archetypes in milestone 5. `pageSize(name, marginsMm)` converts A4/Letter to CSS px at 96 dpi.
32. **Break rules, as implemented.** A block's top chrome (its heading) is drawn only on its first fragment, and that fragment always holds at least one atom, so a heading never ends a page. A continued fragment has `range.continued` set, so render can mark it (for example "Experience, continued") without the engine knowing. `orphans` and `widows` default to 1. On an empty page, where moving on cannot help, the rules relax in order: first keep-together, orphans and widows, then keep-with-next, then one atom alone (marked `overflow` if it is taller than the page). So a keep-with-next chain taller than a page is split, not clipped.
33. **Incremental relayout restarts one page earlier than the contract's TODO.** The TODO restarts at the first page that holds a changed block. The engine restarts at the page that holds the end of the last unchanged block, because a changed block that got shorter may now fit on that page. Convergence is as specified: once a new page starts at the same (block, atom) as an old page, and every block from there on is unchanged, the old pages from there on are appended by identity. To learn where a page ends, the engine also measures the first block after the re-laid pages; the DOM measurer's cache makes that a lookup.
34. **`SurfaceName` and the foreground role names live in `domain/surface.ts`** (`SURFACE_NAMES`, `FOREGROUND_ROLES`). `primitives` needs them for `OnSurface` but cannot import `themes`, because `themes` imports `primitives`. The contrast policy itself, the level each role needs, stays in `themes/color`. `SURFACE_FOREGROUNDS` now `satisfies Record<ForegroundRole, ContrastLevel>`, so if a role is added or dropped on one side and not the other, tsc fails. `themes` re-exports both types, so nothing that imported them changes.
35. **The surface CSS-variable contract belongs to primitives.** `surfaceVar(surface, role)` names the variable a theme sets (`--s-raised-text`). `OnSurface` points `--bg` and `--fg-<role>` at it for its subtree. Content reads only `--fg-<role>`, so it can only use colors solved against the background it sits on. `themes` will emit its `cssVars` through `surfaceVar` (slice 4).
36. **Block kit shape.**
    - `BlockVariants` is defined in `primitives`, since primitives owns the closed set, and is narrowed to what M3 ships: entries `stacked | row`, tags `inline`, prose `plain`, identity `stacked | banner`. The contract's other variants arrive with the archetypes that use them (M5).
    - One entry point, `BlockView({ blockKey, shape, style, content, heading, range, surface })`. It renders the section frame and its h2, and picks the variant.
    - Heading levels come from a primitives-private `HeadingLevel` context: identity name h1, section h2, entry title h3.
    - `Atom` takes `as` (`div | li | p | header`), so a bullet is the `li` itself.
    - `RichTextView` takes `base` (the index of its first atom in the block) and `keepLastWithNext`.
    - An entry's atoms are its header (keep-with-next when it has a body), each paragraph or bullet, and its tag line. The last body atom keeps with the tag line.
    - `AtomRange` is declared in both `engine` and `primitives`, because neither may import the other. The two are structurally identical, so tsc checks them where render passes one to the other.
37. **Not in the M3 kit yet.**
    - Contact icons: `CONTACT_ICON` lives in `sections` (deviation 2), which primitives can't import. Icon toggles are M5.
    - The identity photo.
    - Theme vocabulary: "Present" is the default argument of `formatDateRange`. Vocab arrives with `resolveTheme`.
    - A "continued" label on a split section's second fragment: the fragment has `data-continued` but no heading.
38. **`resolveTheme(variant)` is synchronous** and returns a `ResolvedTheme`, not a Promise. The M3 archetypes use system font stacks, so there is nothing to load yet. It becomes async when presets and web fonts arrive as lazy chunks (M6); render is the only caller.
39. **`ThemeBase` is smaller than the contract's.**
    - It has no `layout`: M3 archetypes are one column, and `LayoutSpec` arrives with the multi-region archetypes in M5.
    - It has no `radius`, `bespoke`, `decor` or `iconOverrides`.
    - `typography` is a CSS font stack, a point scale and a heading case. It has no `FontPairId` or `load()`, so `Customization.fontPair` is not used yet.
    - `id` is an `ArchetypeId`. The archetypes live in a typed record (`ARCHETYPES`, `satisfies Partial<Record<ArchetypeId, ThemeBase>>`), not a glob: they are a closed union, so the compiler checks the list. Presets will still be a glob.
40. **Fallbacks until the rest exists.** `auto`, every preset, `sidebar` and `app-ui` render as `classic`. `auto` is meant to pick from the brand (ground mode, logo aspect), but with only two archetypes there is nothing to choose between yet. `listThemeChoices` arrives with the theme picker.
41. **`ResolvedTheme` has no `logo`** (`showLogo` is M4).
    - `styleHash` covers only what changes geometry: archetype, block styles, and the type and spacing variables. Changing the brand or the role choice recolors without re-measuring. `key` covers colors too.
    - Page size and margins are not in either hash, because the engine compares them itself.
42. **The type and spacing variables are a checked contract.** `primitives` exports `THEME_VARS`, the `--rs-*` variables its CSS reads. `themes` must return all of them (`Record<ThemeVar, string>`), and a test keeps the list equal to the variables the stylesheet actually reads. To make that test possible, vitest now processes `*.css?raw` imports (`vitest.config.ts`).
