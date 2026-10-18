# Synthesized design: layout engine with themes as data, rendered on contrast-safe surfaces

## Problem

One resume's content has to render in the visual language of whichever company the user is applying to. That includes companies nobody has ever hand-themed: theme colors are extracted from the target's logo and are never raw behind text. The output has to be a paginated preview that is the same thing as the exported PDF.

The shape isn't obvious because six hard constraints pull against each other:
- WCAG AA contrast for arbitrary logo colors, enforced at derivation;
- a real, tagged-where-possible PDF;
- typing under 50 ms, with re-pagination only from the first changed block;
- a ~150 KB editor shell;
- a static site that still needs logo pixels across CORS;
- extension that's agent-proof: one folder per section kind or preset, no hand-synced lists.

Themes may not touch editor state or storage. The builder UI is light; resume colors always come from the logo palette.

## Usage (caller's view)

```ts
// Add a section kind: one folder. The folder name IS the kind; nothing else to edit.
// src/sections/volunteering/section.ts
export default defineSection({
  defaultLabel: 'Volunteering', defaultIcon: 'heartHandshake', cardinality: 'many', shape: 'entries',
  item: { org: f.text('Organisation', { required: true }), role: f.text('Role'), dates: f.dateRange('Dates'), body: f.rich('Highlights') },
  project: (it) => ({ title: it.org, subtitle: it.role, dates: it.dates, tags: [], body: it.body }),
  jsonResume: { key: 'volunteer', from: (v) => ({ /* … */ }), to: (it) => ({ /* … */ }) },
});
// Every theme (generated or preset) renders it the day it lands, as an 'entries' block.
```

```ts
// Add a bespoke preset (optional): src/themes/presets/netflix/{manifest.ts, preset.ts, EpisodeRow.tsx, TitleCard.tsx}
export default definePresetManifest({ label: 'Streaming (Netflix-style)', domains: ['netflix.com'] }); // id = folder name
export default definePreset({
  extends: 'app-ui', roleHints: { ground: 'ground', accent: 'most-chromatic', boost: 0 },   // no colors exist on a preset
  blocks: { identity: 'bespoke', entries: 'bespoke', tags: 'tiles', prose: 'callout' },
  bespoke: { identity: TitleCard, entries: EpisodeRow },
  layout: { /* … */ placement: { main: [{ band: [[k('education')], [k('skills')]] }, { kinds: [k('experience')] },
            { band: [[k('projects')], [k('achievements')]], style: { entries: 'card' } }, { kinds: ['*'] }] } },
  vocab: { headings: { experience: (l) => `Explore titles related to: ${l}` }, present: 'Now streaming', badges: { headline: '#1 in Applicants Today' } },
});
```

```tsx
// Editor call sites
<ResumePreview variant={{ resumeId, variantId }} onPages={setPageCount} />            // 1. preview: everything hidden

const res = await lookupBrand({ name: 'Experian', url: 'experian.com' }, { signal });  // 2. target company
if (res.ok) dispatch(resumeId, { type: 'variant/create', variantId: newId(), target: res.profile, base: { kind: 'auto' } });
else if (res.reason === 'ambiguous') pickFrom(res.candidates); else offerUpload(res.fallback);

await printVariant({ resumeId, variantId });                                         // 3. export: same DOM → browser PDF
```

## Shape

**Data.**
- `ResumeDocument` holds normalized content: `sections` and `items` by id, plus `sectionOrder` and per-section `itemOrder`. It also holds its `variants`.
- A `Variant` owns presentation only:
  - a **pinned** `BrandSnapshot`;
  - `themeBase` (`auto`, an archetype, or a preset);
  - `roles: RoleChoice` (user-owned swatch picks);
  - `Customization`;
  - `hidden`.
- Content is what's true. A variant is how one application shows it. `resolveView` merges the two at read time, per separate-before-serializing-shared-state.
- Visibility has exactly one scope (per variant). Order has exactly one owner (content).

**Flow.**
```
lookupBrand → BrandProfile
  → variant/create pins it
  → resolveTheme(variant) = derivePalette(snapshot.palette, roles) + ThemeBase + Customization
  → ResolvedTheme
  → resolveView + project
  → layoutDocument
  → PagedLayout
  → <ResumePreview>, the same DOM that printVariant prints.
```
The trace fits in three files: `render/ResumePreview.tsx`, `themes/resolve.ts`, `engine/layout.ts`.

**Load-bearing decisions.**

1. **Themes style four content shapes, not N section kinds.**
   - The shapes are `entries | tags | prose | identity`. A theme is colorless data: a layout of regions in reading order, slots, one block style per shape (overridable per slot), vocabulary, and typography.
   - A generated theme is an archetype plus a palette, so it needs zero hand code for any company.
   - Bespoke presets get a constrained escape hatch. A `BespokeBlock<S>` receives only shape content and a resolved theme. Text goes through `Text`/`Heading`/`RichTextView`, visuals through `Decor`, color through `OnSurface`, and break points are marked with `<Atom>`. The engine measures and splits it like any other block.

2. **Contrast is a type, minted in one function (graft G1).**
   - `AccessiblePalette` is `surfaces: Record<'page'|'raised'|'sunken'|'accent', Surface>`.
   - In each `Surface`, every foreground (`text`, `muted`, `accentText`, `heading`, `icon`, `rule`) is a `ContrastSafe<'AA-text'|'AA-ui'>`. Only `ensureContrast` can mint one: it keeps the hue, bisects lightness, gamut-maps chroma, and asserts the result before minting. That function is private to `themes/color`.
   - `SURFACE_FOREGROUNDS` is the single policy list. The `Surface` type and the solver loop both derive from it.
   - `<OnSurface>` is the only way to put a background behind content, and it sets that surface's minted foregrounds for its subtree. Text can therefore only sit on the background it was solved against.
   - Headings are held to 4.5:1 (C2's rule), not 3:1, because heading size varies with customization.
   - Brand hue is preserved and lightness is adjusted, so a color is never raw behind text (per encode-lessons-in-structure).

3. **One DOM, measure then paginate, with convergence (graft G2).**
   - Blocks render offscreen at region width. Atom heights are cached by `(contentHash, styleHash, width)`.
   - `layoutDocument` is deterministic. It reuses pages before the first dirty block by identity, re-paginates from that page, and stops as soon as a page starts at the same `(key, atom)` with nothing dirty after it, appending the old tail by identity.
   - Typing in one bullet therefore re-measures one block and usually re-lays one page.
   - The preview *is* the print DOM: fixed mm page boxes and `@page { margin: 0 }`. The PDF comes from browser print, which Chromium tags from semantic HTML.

4. **One brand boundary.**
   - `lookupBrand(CompanyQuery)` is the only way to get a `BrandProfile`.
   - Private behind it: query normalization, an IndexedDB cache (stale-while-revalidate), a ~100-line edge function (site head and manifest, logo proxy, optional brand-search key held server-side), wire parsing, and a palette Web Worker (median-cut in OKLab, ground detection).
   - Failure is a value: `ambiguous` returns candidates; anything else returns a fallback profile, and the UI offers logo upload.
   - The cache only speeds up lookups. The pinned snapshot is the record, so a refetch never changes a resume you already sent, and swatch indices never drift. "Refresh brand" is an explicit command that resets numeric picks to strategies.

**Where invariants live.**
- In types: `ContrastSafe`, `AccessiblePalette`, and `LogoPalette` are branded and minted once each. `IconName` is `keyof` the registry. `Heading` has no level prop. Presets have no color fields. `FieldSpec.label` is required.
- At boundaries: `io/` (valibot, JSON Resume), `brand/` (wire → domain), `storage/` (record → domain, migrations).
- In tests that fail the build: section folder exports; preset folder has both files; vocab and placement kinds exist in `sectionRegistry`; contrast property tests over 10k palettes; axe-core over every preset × fixture brands (white-ground, near-black, neon, pastel, gray-only); size-limit; Playwright typing benchmark.

**Depth.** The public surface is:
- `ResumePreview`, `printVariant`, `lookupBrand`, `resolveTheme`, and `listThemeChoices`;
- `defineSection`, `definePreset`, and `definePresetManifest`;
- `useDispatch` plus selector hooks.

Behind it sit projection, contrast solving, measurement caching, convergent pagination, CORS, workers, caching, migrations, and cross-tab locks. Engine pieces (`Measurer`, `layoutDocument`) are reachable only from `render/` and tests.

**Deliberately not done:**
- arbitrary HTML or CSS in themes;
- per-section-kind theme components;
- theme access to the store;
- runtime theme code fetched from the network;
- a PDF library in v1;
- icon fonts;
- per-variant ordering.

## Synthesis decision

- **Base: candidate 2 (26/30 vs 23/30).** Data-only themes over four shapes make generated themes the default path. One engine whose DOM is the print DOM gives preview == PDF. Pinned brand snapshots make resumes reproducible and remove C1's split-ownership bug, where a user's swatch index pointed into a palette the fetcher could rewrite.
- **Graft G1, from candidate 1: surface-bundled `ContrastSafe<L>` minted only by `ensureContrast`, plus `<OnSurface>`.** C2's flat role record guaranteed pairs only in a policy table; nothing stopped a renderer from putting `text` on `accent`. Bundling foregrounds with their background makes a wrong pairing unrepresentable. C2's `CONTRAST_POLICY` becomes `SURFACE_FOREGROUNDS`, the one list both the type and the solver derive from.
- **Graft G2, from candidate 1: convergence stop in incremental pagination.** C2 restarted at the dirty page but then re-laid every later page. C1's rule (stop when a page start matches the previous layout and nothing later is dirty) bounds the work per keystroke.
- **Also adopted from C1's model, as a red-flag fix:** one hide scope (per variant). This removes C2's document-level `hidden`, the `scope` on `move` and `visibility`, and `orderOverride`, all of which were two ways to do one task.
- **Small fixes to the base:**
  - preset and section ids derived from folder names (no duplicated id);
  - `IconName = keyof typeof iconRegistry`;
  - block style overridable per placement slot (Netflix projects as cards while experience uses episode rows);
  - `item/set` typed with `FieldValue`, not `unknown`;
  - an `ambiguous` brand result for name-only queries (from C1's `needsChoice`).
- **Rejected from C1:**
  - Themes as React component trees per kind. This is shallow, grows N×M, and a new kind looks plain in every preset.
  - Separate `useTheme` + `ResumePages(view, theme)` wiring (the caller coordinates stages).
  - Live, unpinned brand cache as the source of appearance.
  - `Heading level` prop.
  - AA-large headings with a size floor. More complex and fragile under font scaling.
- **Rejected from C2:**
  - Dual hide/order scopes.
  - Publicly exported `createDomMeasurer`.
  - The flat `AccessiblePalette` record.

## Tradeoffs accepted

- We accept browser-print PDF, tagged only in Chromium and with one print dialog, in exchange for one render path and pagination identical to the preview.
- We accept a closed set of shared block variants (a new one means editing `primitives/`) in exchange for zero section × theme coupling and guaranteed semantics and pagination. `BespokeBlock` is the narrow exception.
- We accept 10–30 KB of duplicated brand data per variant in exchange for reproducible, offline resumes and no drift on refetch.
- We accept visibly adjusted brand colors (a pale yellow becomes a darker yellow band) in exchange for guaranteed readability. The user can pick another swatch.
- We accept per-variant-only hiding ("hide everywhere" means delete) in exchange for one way to hide.
- We accept a main-thread offscreen measure pass in exchange for exact line wrapping that matches print. Hash caching keeps it to the changed block.
- We accept one deployed edge function in exchange for real logo pixels and `theme-color`. Without it, upload still works.

## Alternatives considered

- **Theme = React component tree per company, rendering section kinds itself.** Its surface is maximally flexible but shallow. Every theme must know every kind (N×M), it can't be generated from brand data, and each theme guesses at pagination. It lost on the requirement change.
- **react-pdf as the single renderer.** It hides PDF quirks but exposes a non-DOM layout model to themes. It adds about 500 KB, re-renders the whole document per keystroke, and produces no tags. That's worse on both hard requirements.
- **CSS fragmentation or Paged.js instead of an engine.** No engine to write, but break decisions are opaque and non-incremental, and the page count only exists after a full chunking pass.

## Open questions and risks

1. Is one deployed edge function (Cloudflare Pages Function, free tier) acceptable for v1? Should it call a keyed brand API (Brandfetch: rate limits, ToS), or only scrape the site's `theme-color`, manifest, and icons?
2. Are lookalike preset chrome (Netflix-style "N" block letter, Play/More Info, episode controls) and an opt-in target logo acceptable trademark risk for a public site? Should export show a short disclaimer?
3. When no logo can be obtained (proxy down, user skips upload), the palette falls back to neutrals plus a name-hash hue. That is the one case where resume colors aren't logo-derived. Is that acceptable, or should export require an uploaded logo?
4. Is "accessible PDF" a Chromium-only promise (Firefox and Safari still give real text in order, but untagged)? Should the release gate include a veraPDF/PAC check of sample exports, given that Chromium's artifact tagging of `aria-hidden` SVG and CSS-grid reading order still needs a day-one spike?
5. Is per-variant hide/show enough tailoring for v1, or do you want per-variant section order too (deliberately cut here as a second way to order)?

## Next implementation step

Build the two pure cores with property tests before any UI:
- `themes/color.ts` (`ensureContrast`, `derivePalette`): every `Surface` foreground passes for 10k random palettes;
- `engine/layout.ts` (`layoutDocument` over a fake `Measurer`): keep-with-next, splitting, incremental restart, and convergence produce a layout equal to a from-scratch run.

## Addendum (2026-10-18): AI company persona (owner-approved, later milestone)
Owner sees the AI persona as the product's differentiator.
- Brand edge function also returns site text (title, meta description, a short homepage excerpt). A cheap LLM call turns it into a strictly validated `CompanyPersona` { industry, summary, vocab: Record<SectionShapeRole,string>, centerpiece: CenterpieceId from a FIXED registry (score-dial, episode-row, tab-strip, stat-dashboard, ...), tone }. Parsed into domain types at the boundary (boundary-discipline); invalid output -> plain persona fallback. Cached per domain in IndexedDB alongside BrandProfile and pinned per variant.
- AI chooses, never authors: no AI-generated CSS/colors/layout. Colors stay logo-derived through ensureContrast; centerpieces are pre-built accessible components.
- Anti-sameness: persona is company x candidate. A second step maps the candidate's own content into the centerpiece (e.g. the dial shows the candidate's strongest metric) and picks which items get persona emphasis; multiple centerpieces/archetypes per persona chosen by content. ATS-plain export always available.
- Later: job-description-aware bullet tailoring.
- Score dial is the first centerpiece to build.
Milestone: 4b "AI persona" after the brand pipeline (M4), before bespoke presets.
