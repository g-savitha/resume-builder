import type { IconName } from '@/icons';
import type { Brand, BrandSnapshot, DataUrl, RoleChoice, ThemeBaseRef } from './brand';
import type { CompanyPersona } from './persona';

export type ResumeId = Brand<string, 'ResumeId'>;
export type VariantId = Brand<string, 'VariantId'>;
export type SectionId = Brand<string, 'SectionId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type NodeId = SectionId | ItemId;
/** Folder name under src/sections/. Values exist only as keys of sectionRegistry. */
export type SectionKind = Brand<string, 'SectionKind'>;

/** 'YYYY' | 'YYYY-MM'. Parsed at boundaries (editor, io, storage), trusted inside. */
export type PartialDate = Brand<string, 'PartialDate'>;
export interface DateRange {
  readonly start?: PartialDate;
  readonly end?: PartialDate | 'present';
}
/** http(s):, mailto:, tel: only. */
export type SafeUrl = Brand<string, 'SafeUrl'>;

/* Rich text: a closed AST. No HTML anywhere in the domain. Each `ul` item is one pagination atom. */
export type Mark = 'bold' | 'italic';
export type TextRun = { readonly t: 'text'; readonly text: string; readonly marks?: readonly Mark[] };
export type Inline = TextRun | { readonly t: 'link'; readonly href: SafeUrl; readonly children: readonly TextRun[] };
export type RichBlock =
  | { readonly t: 'p'; readonly children: readonly Inline[] }
  | { readonly t: 'ul'; readonly items: readonly (readonly Inline[])[] };
export type RichText = readonly RichBlock[];

/* The four content shapes. Themes style shapes; they never see a section kind's fields. */
export interface EntryContent {
  readonly title: string;
  readonly subtitle?: string;
  readonly dates?: DateRange;
  readonly place?: string;
  readonly url?: SafeUrl;
  readonly tags: readonly string[];
  readonly body: RichText;
}
export interface Tag {
  readonly name: string;
  readonly level?: 1 | 2 | 3 | 4 | 5;
}
export interface TagGroupContent {
  readonly label?: string;
  readonly tags: readonly Tag[];
}
export const CONTACT_KINDS = ['email', 'phone', 'location', 'linkedin', 'github', 'website', 'x', 'other'] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];
export interface Contact {
  readonly kind: ContactKind;
  readonly text: string;
  readonly href?: SafeUrl;
}
export interface IdentityContent {
  readonly name: string;
  readonly headline?: string;
  readonly photo?: DataUrl;
  readonly contacts: readonly Contact[];
}
export type ShapeName = 'entries' | 'tags' | 'prose' | 'identity';
export interface ShapeContent {
  entries: EntryContent;
  tags: TagGroupContent;
  prose: RichText;
  identity: IdentityContent;
}

/** Every value an item field can hold. Shape per kind is fixed by its FieldSpecs; validated on load/import. */
export type FieldValue = string | RichText | DateRange | readonly Tag[] | readonly Contact[] | DataUrl | null;

export type CustomShape = Exclude<ShapeName, 'identity'>;
export interface Section {
  readonly id: SectionId;
  readonly kind: SectionKind;
  /** User label override; absent → theme vocab → SectionDef.defaultLabel. */
  readonly title?: string;
  /** Only for kind 'custom': the shape the user picked and an icon. */
  readonly custom?: { readonly shape: CustomShape; readonly icon?: IconName };
  readonly itemOrder: readonly ItemId[];
}
export interface Item {
  readonly id: ItemId;
  readonly sectionId: SectionId;
  readonly data: Readonly<Record<string, FieldValue>>;
}

/** Normalized content + its variants. One record per resume in storage. */
export interface ResumeDocument {
  readonly id: ResumeId;
  readonly name: string;
  /** BCP-47 → <html lang> → PDF language. */
  readonly lang: string;
  readonly sections: Readonly<Record<SectionId, Section>>;
  readonly items: Readonly<Record<ItemId, Item>>;
  /** Order is content (one owner). */
  readonly sectionOrder: readonly SectionId[];
  readonly variants: Readonly<Record<VariantId, Variant>>;
  readonly variantOrder: readonly VariantId[];
  readonly activeVariant: VariantId;
  /** Increments only when applyCommand changed something. */
  readonly rev: number;
}

/**
 * One target company. Content is shared; a variant owns presentation only.
 * Visibility lives ONLY here (one hide scope: "hide everywhere" = delete, or hide per variant).
 */
export interface Variant {
  readonly id: VariantId;
  readonly label: string;
  /** Pinned copy of the brand at create/refresh time. The document, not the cache, decides how a sent resume looks. */
  readonly brand: BrandSnapshot;
  readonly themeBase: ThemeBaseRef;
  /** User-owned: which swatch fills which role. Indices refer to brand.palette of THIS snapshot, so they never drift. */
  readonly roles: RoleChoice;
  readonly customization: Customization;
  /** Sorted, unique (kept by applyCommand); array so it serializes. */
  readonly hidden: readonly NodeId[];
  /** Pinned AI persona (M4b): heading words and a centerpiece. Absent = none (or turned off). */
  readonly persona?: CompanyPersona;
}

export type FontPairId = Brand<string, 'FontPairId'>;
export interface Customization {
  readonly fontPair?: FontPairId;
  readonly fontScale: 0.9 | 0.95 | 1 | 1.05 | 1.1;
  readonly lineHeight: 'tight' | 'normal' | 'relaxed';
  readonly sectionGap: 'compact' | 'normal' | 'airy';
  readonly page: 'A4' | 'Letter';
  readonly marginsMm: 10 | 15 | 20 | 25;
  /** Default false (trademark judgment call). */
  readonly showLogo: boolean;
  readonly icons: {
    readonly contact: boolean;
    readonly headings: boolean;
    readonly bullets: boolean;
    readonly style: 'line' | 'badge';
  };
}

export const DEFAULT_CUSTOMIZATION: Customization = {
  fontScale: 1,
  lineHeight: 'normal',
  sectionGap: 'normal',
  page: 'A4',
  marginsMm: 15,
  showLogo: false,
  icons: { contact: true, headings: false, bullets: false, style: 'line' },
};

/** Strategies, not indices, so they survive a brand refresh. */
export const DEFAULT_ROLES: RoleChoice = { ground: 'ground', accent: 'most-chromatic', boost: 0 };
