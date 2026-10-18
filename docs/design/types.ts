/**
 * Synthesized type sketch: candidate 2 base (layout engine first, themes as colorless data)
 * with two grafts from candidate 1:
 *   G1. Surface-bundled contrast: every foreground is a ContrastSafe<Level>, minted only by ensureContrast,
 *       and grouped with the one background it was solved against (Surface). Components pick a Surface, never loose colors.
 *   G2. Convergent incremental pagination: restart at the first dirty page AND stop as soon as a page starts at the
 *       same (block, atom) as before with nothing dirty after it; reuse the tail by identity.
 * Red-flag fixes vs. both candidates: one hide scope (per variant), no per-variant order in v1, ids derived from folder
 * names (no duplicated ids), IconName derived from the registry, block style overridable per slot.
 *
 * Sections marked `module: X` live in src/X/. Bodies throw. `// TODO` marks tricky logic.
 * Data flow: CompanyQuery → lookupBrand → BrandProfile → (variant/create pins) BrandSnapshot
 *            → resolveTheme (derivePalette → AccessiblePalette) → resolveView + project → layoutDocument → PagedLayout
 *            → <ResumePreview> (same DOM) → printVariant → browser PDF.
 */
import type { ComponentType, ReactNode } from 'react';

const NI = (): never => { throw new Error('not implemented'); };
declare const brandTag: unique symbol;
type Brand<T, B extends string> = T & { readonly [brandTag]: B };
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

/* ═══════════════════════════════ module: domain ═══════════════════════════════ */

export type ResumeId = Brand<string, 'ResumeId'>;
export type VariantId = Brand<string, 'VariantId'>;
export type SectionId = Brand<string, 'SectionId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type NodeId = SectionId | ItemId;
/** Folder name under src/sections/. Values exist only as keys of sectionRegistry. */
export type SectionKind = Brand<string, 'SectionKind'>;
/** Client-generated ids make every create command idempotent (replay finds the id already present). */
export function newId<T extends ResumeId | VariantId | SectionId | ItemId>(): T { return NI(); }

/** 'YYYY' | 'YYYY-MM'. Parsed at boundaries (editor, io, storage), trusted inside. */
export type PartialDate = Brand<string, 'PartialDate'>;
export interface DateRange { readonly start?: PartialDate; readonly end?: PartialDate | 'present' }
/** http(s):, mailto:, tel: only. */
export type SafeUrl = Brand<string, 'SafeUrl'>;
export type DataUrl = Brand<string, 'DataUrl'>;

/* Rich text: a closed AST. No HTML anywhere in the domain. Each `ul` item is one pagination atom. */
export type Mark = 'bold' | 'italic';
export type TextRun = { readonly t: 'text'; readonly text: string; readonly marks?: readonly Mark[] };
export type Inline = TextRun | { readonly t: 'link'; readonly href: SafeUrl; readonly children: readonly TextRun[] };
export type RichBlock =
  | { readonly t: 'p'; readonly children: readonly Inline[] }
  | { readonly t: 'ul'; readonly items: readonly (readonly Inline[])[] }; // one bullet level in v1
export type RichText = readonly RichBlock[];

/* The four content shapes. Themes style shapes; they never see a section kind's fields. */
export interface EntryContent {
  readonly title: string; readonly subtitle?: string; readonly dates?: DateRange;
  readonly place?: string; readonly url?: SafeUrl; readonly tags: readonly string[]; readonly body: RichText;
}
export interface Tag { readonly name: string; readonly level?: 1 | 2 | 3 | 4 | 5 }
export interface TagGroupContent { readonly label?: string; readonly tags: readonly Tag[] }
export type ContactKind = 'email' | 'phone' | 'location' | 'linkedin' | 'github' | 'website' | 'x' | 'other';
export interface Contact { readonly kind: ContactKind; readonly text: string; readonly href?: SafeUrl }
export interface IdentityContent { readonly name: string; readonly headline?: string; readonly photo?: DataUrl; readonly contacts: readonly Contact[] }
export type ShapeName = 'entries' | 'tags' | 'prose' | 'identity';
export interface ShapeContent { entries: EntryContent; tags: TagGroupContent; prose: RichText; identity: IdentityContent }

/** Every value an item field can hold. Shape per kind is fixed by its FieldSpecs; validated on load/import. */
export type FieldValue = string | RichText | DateRange | readonly Tag[] | readonly Contact[] | DataUrl | null;

export interface Section {
  readonly id: SectionId; readonly kind: SectionKind;
  /** User label override; absent → theme vocab → SectionDef.defaultLabel. */
  readonly title?: string;
  /** Only for kind 'custom': the shape the user picked and an icon. */
  readonly custom?: { readonly shape: Exclude<ShapeName, 'identity'>; readonly icon?: IconName };
  readonly itemOrder: readonly ItemId[];
}
export interface Item { readonly id: ItemId; readonly sectionId: SectionId; readonly data: Readonly<Record<string, FieldValue>> }

/** Normalized content + its variants. One record per resume in storage. */
export interface ResumeDocument {
  readonly id: ResumeId; readonly name: string;
  readonly lang: string;                                   // BCP-47 → <html lang> → PDF language
  readonly sections: Readonly<Record<SectionId, Section>>;
  readonly items: Readonly<Record<ItemId, Item>>;
  readonly sectionOrder: readonly SectionId[];             // order is content (one owner)
  readonly variants: Readonly<Record<VariantId, Variant>>;
  readonly variantOrder: readonly VariantId[];
  readonly activeVariant: VariantId;
  readonly rev: number;                                    // increments only when applyCommand changed something
}

/**
 * One target company. Content is shared; a variant owns presentation only.
 * Visibility lives ONLY here (one hide scope: "hide everywhere" = delete, or hide per variant).
 */
export interface Variant {
  readonly id: VariantId; readonly label: string;          // "Experian – Sr FE"
  /** Pinned copy of the brand at create/refresh time. The document, not the cache, decides how a sent resume looks. */
  readonly brand: BrandSnapshot;
  readonly themeBase: ThemeBaseRef;
  /** User-owned: which swatch fills which role. Indices refer to brand.palette of THIS snapshot, so they never drift. */
  readonly roles: RoleChoice;
  readonly customization: Customization;
  /** Sorted, unique (kept by applyCommand); array so it serializes. */
  readonly hidden: readonly NodeId[];
}

export type FontPairId = Brand<string, 'FontPairId'>;
export interface Customization {
  readonly fontPair?: FontPairId;                          // undefined → theme default
  readonly fontScale: 0.9 | 0.95 | 1 | 1.05 | 1.1;
  readonly lineHeight: 'tight' | 'normal' | 'relaxed';
  readonly sectionGap: 'compact' | 'normal' | 'airy';
  readonly page: 'A4' | 'Letter';
  readonly marginsMm: 10 | 15 | 20 | 25;
  readonly showLogo: boolean;                              // default false (trademark judgment call)
  readonly icons: { readonly contact: boolean; readonly headings: boolean; readonly bullets: boolean; readonly style: 'line' | 'badge' };
}

/** Every edit. All idempotent: carry target values/indices and client ids, never deltas. */
export type Command =
  | { readonly type: 'item/set'; readonly itemId: ItemId; readonly field: string; readonly value: FieldValue }
  | { readonly type: 'item/create'; readonly sectionId: SectionId; readonly itemId: ItemId; readonly atIndex: number }
  | { readonly type: 'item/delete'; readonly itemId: ItemId }
  | { readonly type: 'item/move'; readonly itemId: ItemId; readonly toSection: SectionId; readonly toIndex: number }
  | { readonly type: 'section/create'; readonly sectionId: SectionId; readonly kind: SectionKind; readonly atIndex: number; readonly custom?: Section['custom'] }
  | { readonly type: 'section/delete'; readonly sectionId: SectionId }
  | { readonly type: 'section/rename'; readonly sectionId: SectionId; readonly title: string | undefined }
  | { readonly type: 'section/move'; readonly sectionId: SectionId; readonly toIndex: number }
  | { readonly type: 'visibility/set'; readonly variantId: VariantId; readonly node: NodeId; readonly hidden: boolean }
  | { readonly type: 'variant/create'; readonly variantId: VariantId; readonly target: BrandProfile; readonly base: ThemeBaseRef; readonly copyFrom?: VariantId }
  | { readonly type: 'variant/select'; readonly variantId: VariantId }
  | { readonly type: 'variant/refreshBrand'; readonly variantId: VariantId; readonly target: BrandProfile }
  | { readonly type: 'variant/customize'; readonly variantId: VariantId; readonly patch: Partial<Customization> }
  | { readonly type: 'variant/setRoles'; readonly variantId: VariantId; readonly roles: RoleChoice }
  | { readonly type: 'variant/setBase'; readonly variantId: VariantId; readonly base: ThemeBaseRef }
  | { readonly type: 'variant/delete'; readonly variantId: VariantId };

/**
 * Pure reducer with structural sharing (untouched sections/items keep identity → memo hits).
 * Invariants: order arrays contain exactly the existing ids; hidden sorted+unique; ≥1 variant; activeVariant exists;
 * rev bumps only on change. Same command twice → identical document.
 */
export function applyCommand(doc: ResumeDocument, cmd: Command): ResumeDocument {
  // TODO variant/create: roles := base preset roleHints (resolved lazily in themes/, stored as RoleChoice strategies, not indices)
  // TODO variant/refreshBrand: replace brand snapshot; reset numeric swatch picks to strategies (indices may now be stale)
  return NI();
}

/** Visibility-filtered read model for one variant. Memoized per (doc.rev, variantId) by the store selector. */
export interface ResumeView {
  readonly lang: string;
  readonly title: string;                                  // "Name – Resume – Company" → document.title → PDF Title
  readonly sections: readonly { readonly section: Section; readonly items: readonly Item[] }[];
  readonly variant: Variant;
}
export function resolveView(doc: ResumeDocument, variantId: VariantId): ResumeView { return NI(); }

/* ═══════════════════════════════ module: sections ═══════════════════════════════ */

/** Editor field spec. Forms are generated from it; `label` is required, so an unlabeled field can't exist. */
export type FieldSpec =
  | { readonly k: 'text'; readonly label: string; readonly required?: boolean; readonly multiline?: boolean }
  | { readonly k: 'rich'; readonly label: string }
  | { readonly k: 'dateRange'; readonly label: string }
  | { readonly k: 'url'; readonly label: string }
  | { readonly k: 'tags'; readonly label: string; readonly withLevel?: boolean }
  | { readonly k: 'contacts'; readonly label: string }
  | { readonly k: 'image'; readonly label: string };
type ValueOf<F extends FieldSpec> =
  F extends { k: 'text' | 'url' } ? string
  : F extends { k: 'rich' } ? RichText
  : F extends { k: 'dateRange' } ? DateRange
  : F extends { k: 'tags' } ? readonly Tag[]
  : F extends { k: 'contacts' } ? readonly Contact[]
  : F extends { k: 'image' } ? DataUrl | null
  : never;
export type ItemData<Fs extends Record<string, FieldSpec>> = { readonly [K in keyof Fs]: ValueOf<Fs[K]> };

/** A section kind. No `kind` field: the kind IS the folder name (derived by the glob, never typed twice). */
export interface SectionDef<Fs extends Record<string, FieldSpec> = Record<string, FieldSpec>, S extends ShapeName = ShapeName> {
  readonly defaultLabel: string;
  readonly defaultIcon?: IconName;
  readonly cardinality: 'single' | 'many';
  readonly item: Fs;
  readonly shape: S;
  /** Pure; memoized per item identity. Its output hash keys the measure cache. */
  readonly project: (item: ItemData<Fs>) => ShapeContent[S];
  /** io/ builds the whole JSON Resume adapter from these (no second section list). */
  readonly jsonResume?: { readonly key: string; readonly from: (raw: unknown) => Partial<ItemData<Fs>>; readonly to: (it: ItemData<Fs>) => unknown };
}
export function defineSection<const Fs extends Record<string, FieldSpec>, const S extends ShapeName>(def: SectionDef<Fs, S>): SectionDef<Fs, S> { return NI(); }
/** import.meta.glob('./*\/section.ts', { eager: true }); key = folder name. The only list of sections. */
export declare const sectionRegistry: ReadonlyMap<SectionKind, SectionDef>;

/* ═══════════════════════════════ module: icons ═══════════════════════════════ */

export type IconComponent = ComponentType<{ size: string }>;
/** registry.ts: `export const iconRegistry = { mail: Mail, ... } as const` (per-icon Lucide imports + curated brand glyphs). */
export declare const iconRegistry: {
  readonly mail: IconComponent; readonly phone: IconComponent; readonly mapPin: IconComponent; readonly globe: IconComponent;
  readonly linkedin: IconComponent; readonly github: IconComponent; readonly x: IconComponent; readonly dot: IconComponent;
  readonly briefcase: IconComponent; readonly graduationCap: IconComponent; readonly award: IconComponent; readonly code: IconComponent;
  readonly languages: IconComponent; readonly star: IconComponent; readonly play: IconComponent; readonly plus: IconComponent;
  readonly info: IconComponent; readonly thumbsUp: IconComponent; readonly thumbsDown: IconComponent; readonly heartHandshake: IconComponent;
};
/** Derived; never listed by hand. */
export type IconName = keyof typeof iconRegistry;
export const CONTACT_ICON: Readonly<Record<ContactKind, IconName>> = {
  email: 'mail', phone: 'phone', location: 'mapPin', linkedin: 'linkedin', github: 'github', website: 'globe', x: 'x', other: 'dot',
};
/** Always decorative: inline SVG, aria-hidden, focusable=false, no text nodes; color = currentColor from the surface's `icon`. */
export declare const Icon: ComponentType<{ name: IconName; style: 'line' | 'badge' }>;

/* ═══════════════════════════════ module: brand (lazy chunk) ═══════════════════════════════ */

/** At least one of name / url / logoFile. */
export type CompanyQuery =
  | { readonly name: string; readonly url?: string; readonly logoFile?: File }
  | { readonly name?: string; readonly url: string; readonly logoFile?: File };
export type Domain = Brand<string, 'Domain'>;              // lowercase registrable domain
export interface Oklch { readonly l: number; readonly c: number; readonly h: number }
export interface Swatch { readonly color: Oklch; readonly weight: number; readonly isGround: boolean }
/** Minted only by the palette worker (from logo pixels / theme-color) or the name-hash fallback. Never from free hex. */
export type LogoPalette = Brand<{ readonly swatches: readonly Swatch[]; readonly source: 'logo' | 'site-hint' | 'fallback' }, 'LogoPalette'>;
export interface BrandProfile {
  readonly name: string; readonly domain?: Domain;
  readonly logo?: { readonly dataUrl: DataUrl; readonly width: number; readonly height: number }; // downscaled, same-origin
  readonly palette: LogoPalette;
  readonly siteDark?: boolean;                             // theme-color / manifest hint
  readonly fetchedAt: number;
}
/** What a variant pins. Same type on purpose: the cache is an accelerator, the snapshot is the record. */
export type BrandSnapshot = BrandProfile;
export interface BrandCandidate { readonly name: string; readonly domain: Domain; readonly iconDataUrl?: DataUrl }
export type BrandResult =
  | { readonly ok: true; readonly profile: BrandProfile; readonly from: 'cache' | 'network' | 'upload' }
  | { readonly ok: false; readonly reason: 'ambiguous'; readonly candidates: readonly BrandCandidate[] }
  | { readonly ok: false; readonly reason: 'not-found' | 'offline' | 'blocked' | 'no-logo'; readonly fallback: BrandProfile };

/**
 * THE brand boundary; the only way to get a BrandProfile. Private behind it: query normalization, IndexedDB cache
 * (SWR, 30d, key = domain | 'name:'+slug), GET /api/brand (edge fn), wire parsing, logo proxy, palette Web Worker.
 * logoFile short-circuits the network. Never throws for expected failures. Concurrent calls per key share one promise.
 */
export function lookupBrand(q: CompanyQuery, opts?: { readonly signal?: AbortSignal; readonly revalidate?: boolean }): Promise<BrandResult> {
  // TODO worker: createImageBitmap → OffscreenCanvas → drop alpha<0.5 → mark border-connected color as ground →
  //      median-cut in OKLab (k ≤ 6) weighted by pixel share × chroma → merge ΔE<4 → add theme-color swatch.
  return NI();
}

/* ═══════════════════════════════ module: themes / color (G1, from candidate 1) ═══════════════════════════════ */

declare const contrastMint: unique symbol;
export type ContrastLevel = 'AA-text' /* ≥ 4.5 */ | 'AA-ui' /* ≥ 3.0, icons, rules, marks */;
/** A CSS color proven to meet L against the Surface.bg it sits in. Only ensureContrast mints one. */
export type ContrastSafe<L extends ContrastLevel> = string & { readonly [contrastMint]: L };
export type CssColor = Brand<string, 'CssColor'>;           // backgrounds: any logo-derived color is a legal background

/** The single contrast policy. The Surface type and the solver loop are both derived from it. */
export const SURFACE_FOREGROUNDS = {
  text: 'AA-text', muted: 'AA-text', accentText: 'AA-text', heading: 'AA-text', icon: 'AA-ui', rule: 'AA-ui',
} as const satisfies Record<string, ContrastLevel>;
export type Surface = { readonly bg: CssColor } & {
  readonly [K in keyof typeof SURFACE_FOREGROUNDS]: ContrastSafe<(typeof SURFACE_FOREGROUNDS)[K]>;
};
/** page = canvas; raised/sunken = cards, tiles, chips; accent = brand fill (buttons, bands) with its own on-colors. */
export type SurfaceName = 'page' | 'raised' | 'sunken' | 'accent';
export type AccessiblePalette = Brand<{
  readonly mode: 'light' | 'dark';
  readonly surfaces: Readonly<Record<SurfaceName, Surface>>;
  readonly report: readonly { readonly surface: SurfaceName; readonly fg: keyof typeof SURFACE_FOREGROUNDS; readonly ratio: number }[];
}, 'AccessiblePalette'>;

/** Which swatch feeds which role: an index into THIS snapshot's palette, or a strategy (survives brand refresh). */
export type SwatchPick = number | 'most-chromatic' | 'most-weighted' | 'darkest' | 'lightest' | 'ground';
export interface RoleChoice { readonly ground: SwatchPick; readonly accent: SwatchPick; readonly secondary?: SwatchPick; readonly boost: 0 | 1 }

/**
 * themes/color internal (not re-exported from themes/index.ts). Keeps hue, bisects lightness (24 steps), gamut-maps chroma,
 * until contrast ≥ target + 0.1; falls back to the tinted neutral at the far end. Final assert before minting.
 */
export function ensureContrast<L extends ContrastLevel>(fg: Oklch, bg: Oklch, level: L): ContrastSafe<L> { return NI(); }

/**
 * Total: always returns; every Surface foreground passes by construction (ensureContrast is the only minter).
 * TODO: mode from ground swatch L (or siteDark); page L → 0.14–0.20 (dark) / 0.97–0.99 (light), chroma ≤ 0.03, ground hue;
 *       raised/sunken = page ± 0.04–0.08 L; accent.bg = accent swatch with L pushed out of (0.45, 0.6) and ≥3:1 vs page;
 *       for each surface × SURFACE_FOREGROUNDS: mint from brand-hue-tinted neutrals (text/muted/heading) or accent/secondary
 *       hue (accentText/icon/rule). boost=1 targets 7:1 for text. Property test: 10k random palettes incl. gray-only, neon, pastel.
 */
export function derivePalette(p: LogoPalette, roles: RoleChoice): AccessiblePalette { return NI(); }

/* ═══════════════════════════════ module: themes (theme as data) ═══════════════════════════════ */

export type RegionId = 'header' | 'main' | 'side';
/** Regions listed in READING ORDER (= DOM order = PDF tag order); grid only places them visually. */
export interface PageTemplate { readonly grid: { readonly columns: string; readonly areas: readonly string[] }; readonly readingOrder: readonly RegionId[] }
/** The closed set of shared primitive variants per shape. Adding one = edit primitives/ (reviewed). */
export interface BlockVariants {
  entries: 'timeline' | 'stacked' | 'card' | 'row';
  tags: 'inline' | 'chips' | 'tiles' | 'bars';
  prose: 'plain' | 'callout';
  identity: 'banner' | 'stacked' | 'split';
}
/** 'bespoke' selects the preset's BespokeBlock for that shape. */
export type BlockStyles = { readonly [S in ShapeName]: BlockVariants[S] | 'bespoke' };
/** A placement slot. `style`/`surface` override the theme defaults for just this slot (e.g. Netflix projects as cards). */
export type FlowSlot =
  | { readonly kinds: readonly (SectionKind | '*')[]; readonly style?: Partial<BlockStyles>; readonly surface?: SurfaceName }
  | { readonly band: readonly (readonly SectionKind[])[]; readonly style?: Partial<BlockStyles>; readonly surface?: SurfaceName };
export interface LayoutSpec {
  readonly firstPage: PageTemplate; readonly otherPages: PageTemplate;
  /** '*' = every kind not placed elsewhere, in document order. Identity → 'header' when present. */
  readonly placement: Readonly<Partial<Record<RegionId, readonly FlowSlot[]>>>;
}
export interface Vocab {
  readonly headings?: Readonly<Record<string, string | ((label: string) => string)>>;   // keys checked by test against sectionRegistry
  readonly present?: string;
  readonly badges?: { readonly headline?: string };
}
export interface TypographySpec {
  readonly pair: FontPairId;
  readonly scale: { readonly name: number; readonly h2: number; readonly h3: number; readonly body: number; readonly small: number };
  readonly load: () => Promise<void>;                      // lazy font chunk; engine awaits before measuring
}
/** Colorless data. Archetypes and presets are both ThemeBase; a generated theme = archetype + derived palette. */
export interface ThemeBase {
  readonly id: string; readonly label: string;
  readonly layout: LayoutSpec; readonly blocks: BlockStyles; readonly vocab: Vocab;
  readonly typography: TypographySpec; readonly radius: 0 | 4 | 8 | 12;
  readonly roleHints: RoleChoice;
  readonly iconOverrides?: Readonly<Partial<Record<string, IconName>>>;
  readonly bespoke?: { readonly [S in ShapeName]?: BespokeBlock<S> };
  readonly decor?: { readonly logo?: 'header-left' | 'header-right' | 'none' };
}
export type ArchetypeId = 'ats-plain' | 'classic' | 'sidebar' | 'app-ui';
export type ThemeBaseRef = { readonly kind: 'auto' } | { readonly kind: 'archetype'; readonly id: ArchetypeId } | { readonly kind: 'preset'; readonly id: string };

/** Everything a renderer needs. Derived, never stored. */
export interface ResolvedTheme {
  readonly key: string;                                    // hash of all inputs: memo key
  readonly base: ThemeBase; readonly palette: AccessiblePalette; readonly customization: Customization;
  readonly logo?: BrandProfile['logo'];                    // present only if customization.showLogo
  readonly cssVars: Readonly<Record<`--${string}`, string>>;
  readonly styleHash: string;                              // everything affecting geometry; part of the measure cache key
}

/**
 * The one way to get a theme for a variant. 'auto' → preset whose manifest matches brand.domain, else an archetype picked
 * from the brand (ground mode, logo aspect). Lazy-imports the preset chunk + fonts; memoized by (snapshot, roles, base, customization).
 */
export function resolveTheme(variant: Variant): Promise<ResolvedTheme> { return NI(); }
/** For the theme picker: generated archetypes first, then presets matching the domain (eager manifest glob only). */
export function listThemeChoices(brand: BrandProfile): readonly { readonly ref: ThemeBaseRef; readonly label: string }[] { return NI(); }

/** themes/presets/<id>/manifest.ts (eager). No `id`: the id is the folder name. */
export interface PresetManifest { readonly label: string; readonly domains: readonly Domain[] }
export function definePresetManifest(m: { label: string; domains: readonly string[] }): PresetManifest { return NI(); }
/** themes/presets/<id>/preset.ts (lazy). Note: no color fields exist on a preset. */
export type PresetSpec = Partial<Omit<ThemeBase, 'id' | 'label'>> & { readonly extends: ArchetypeId };
export function definePreset(p: PresetSpec): PresetSpec { return NI(); }

/* ═══════════════════════════════ module: primitives ═══════════════════════════════ */

export interface AtomRange { readonly from: number; readonly to: number; readonly continued: boolean }
/**
 * Bespoke escape hatch. Receives only its shape content + resolved theme; text only via Text/Heading/RichTextView,
 * visuals only via Decor/Icon, colors only via OnSurface; marks breakable units with <Atom>; renders exactly atoms [from,to).
 */
export type BespokeBlock<S extends ShapeName> = ComponentType<{
  readonly content: S extends 'entries' | 'tags' ? readonly ShapeContent[S][] : ShapeContent[S];
  readonly heading: string; readonly theme: ResolvedTheme; readonly range: AtomRange;
}>;
/** No `level` prop: identity name = h1, section = h2, entry = h3, assigned by the engine via context. */
export declare const Heading: ComponentType<{ children: ReactNode }>;
export declare const Text: ComponentType<{ children: ReactNode; tone?: 'text' | 'muted' | 'accentText' }>;
/** G1: the only way to put a background behind content; sets bg + all minted foregrounds as CSS vars for its subtree. */
export declare const OnSurface: ComponentType<{ surface: SurfaceName; as?: 'div' | 'article' | 'section' | 'li'; children: ReactNode }>;
/** aria-hidden, not focusable, strips tabIndex/role from children; Chromium tags it as an artifact. */
export declare const Decor: ComponentType<{ children: ReactNode }>;
export declare const Atom: ComponentType<{ i: number; keepWithNext?: boolean; children: ReactNode }>;
/** <p>/<ul>/<strong>/<em>/<a href>; with range, emits only bullets in range, each wrapped in <Atom>. */
export declare const RichTextView: ComponentType<{ value: RichText; range?: { from: number; to: number } }>;

/* ═══════════════════════════════ module: engine (pure; internal to render + tests) ═══════════════════════════════ */

export type Px = Brand<number, 'Px'>;
export interface FlowBlock {
  readonly key: string;                                    // sectionId | `${sectionId}:band`
  readonly contentHash: string;
  readonly shape: ShapeName; readonly style: string; readonly surface: SurfaceName; readonly region: RegionId;
  readonly band?: readonly FlowBlock[];
}
export interface Measured {
  readonly atoms: readonly { readonly h: Px; readonly keepWithNext: boolean }[];
  readonly chromeTop: Px; readonly chromeBottom: Px; readonly gapAfter: Px;
  readonly keepTogether: boolean;
}
/** Offscreen DOM measurer; cache keyed by (contentHash, styleHash, width). Tests use a fake. */
export interface Measurer { measure(block: FlowBlock, width: Px): Measured; ready(theme: ResolvedTheme): Promise<void> }
export interface Fragment { readonly key: string; readonly range: AtomRange; readonly y: Px; readonly h: Px }
export interface RegionBox { readonly id: RegionId; readonly width: Px; readonly height: Px; readonly fragments: readonly Fragment[] }
export interface PageBox { readonly index: number; readonly regions: readonly RegionBox[]; readonly overflow: boolean }
export interface PagedLayout {
  readonly size: { readonly w: Px; readonly h: Px; readonly marginPx: Px; readonly name: 'A4' | 'Letter' };
  readonly pages: readonly PageBox[];
  readonly blocks: ReadonlyMap<string, FlowBlock>;
  readonly inputKeys: readonly string[];                   // `${key}@${contentHash}` in flow order
}
/**
 * Deterministic: same input + same measurements → equal PagedLayout.
 * TODO incremental (G2): firstDirty = first index where inputKeys differ (0 if styleHash/size changed);
 *   reuse prev.pages[0..p) by identity; paginate from the start of page p; after each new page boundary, if the page
 *   starts at the same (key, atom) as prev page j and no inputKey after it changed, append prev.pages[j..] (identity) and stop.
 * TODO paginate: keep-with-next, keepTogether, orphan/widow over atoms; bands = one composite row block; multi-region pages
 *   paginate main/side independently, header only on firstPage; atom taller than a page → placed alone, overflow=true.
 */
export function layoutDocument(input: { readonly view: ResumeView; readonly theme: ResolvedTheme }, m: Measurer, prev?: PagedLayout): PagedLayout { return NI(); }

/* ═══════════════════════════════ module: render ═══════════════════════════════ */

export interface VariantRef { readonly resumeId: ResumeId; readonly variantId: VariantId }
/** view (deferred) → resolveTheme → layoutDocument → fixed-mm page boxes. The same DOM is what prints. */
export declare const ResumePreview: ComponentType<{ variant: VariantRef; zoom?: number; onPages?: (n: number) => void }>;
/** Sets document.title + <html lang>, @page { size; margin: 0 }, awaits fonts + settled layout, window.print(), restores. */
export function printVariant(ref: VariantRef): Promise<void> { return NI(); }

/* ═══════════════════════════════ module: store ═══════════════════════════════ */

/** Synchronous; no-op when this tab doesn't hold the Web Lock for the resume. Structural commands announce via live region. */
export declare function useDispatch(): (resumeId: ResumeId, cmd: Command) => void;
export declare function useItemField(itemId: ItemId, field: string): FieldValue;
export declare function useSectionOrder(resumeId: ResumeId): readonly SectionId[];
export declare function useVariantView(ref: VariantRef): ResumeView;
export declare function useAnnounce(): (msg: string) => void;

/* ═══════════════════════════════ module: storage, io ═══════════════════════════════ */

/** Load all, then subscribe: debounce 800ms → requestIdleCallback → IndexedDB put (rev-guarded); flush on pagehide; Web Locks. */
export function startPersistence(): Promise<() => void> { return NI(); }
export interface ImportIssue { readonly path: string; readonly message: string; readonly severity: 'dropped' | 'coerced' }
/** Native envelope or JSON Resume; parsed (valibot) into domain types; ids regenerated. */
export function importFile(f: File): Promise<Result<{ readonly doc: ResumeDocument; readonly issues: readonly ImportIssue[] }, string>> { return NI(); }
export function exportResume(doc: ResumeDocument, as: 'native' | 'json-resume'): Blob { return NI(); }
