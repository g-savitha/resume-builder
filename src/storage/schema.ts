// Storage boundary: the persisted record → domain types. Everything read from IndexedDB is
// `unknown` until it passes this schema; inside the app the types are trusted.
// Each branded id/value is cast only after the schema has validated the underlying primitive.
import * as v from 'valibot';
import {
  CONTACT_KINDS,
  parseDataUrl,
  parsePartialDate,
  parseSafeUrl,
  type BrandProfile,
  type Contact,
  type Customization,
  type DataUrl,
  type DateRange,
  type Domain,
  type FieldValue,
  type FontPairId,
  type Item,
  type ItemId,
  type LogoPalette,
  type NodeId,
  type PartialDate,
  type ResumeDocument,
  type ResumeId,
  type RichText,
  type RoleChoice,
  type SafeUrl,
  type Section,
  type SectionId,
  type Swatch,
  type SectionKind,
  type Tag,
  type ThemeBaseRef,
  type Variant,
  type VariantId,
} from '@/domain';

const id = <T extends string>() => v.pipe(v.string(), v.minLength(1), v.transform((s) => s as T));
const parsed = <T>(parse: (s: string) => T | null, what: string) =>
  v.pipe(
    v.string(),
    v.check((s) => parse(s) !== null, `invalid ${what}`),
    v.transform((s) => parse(s) as T),
  );

const safeUrl: v.GenericSchema<unknown, SafeUrl> = parsed(parseSafeUrl, 'url');
const partialDate: v.GenericSchema<unknown, PartialDate> = parsed(parsePartialDate, 'date');
const dataUrl: v.GenericSchema<unknown, DataUrl> = parsed(parseDataUrl, 'image');

const textRun = v.strictObject({
  t: v.literal('text'),
  text: v.string(),
  marks: v.exactOptional(v.array(v.picklist(['bold', 'italic']))),
});
const inline = v.variant('t', [textRun, v.strictObject({ t: v.literal('link'), href: safeUrl, children: v.array(textRun) })]);
const richText: v.GenericSchema<unknown, RichText> = v.array(
  v.variant('t', [
    v.strictObject({ t: v.literal('p'), children: v.array(inline) }),
    v.strictObject({ t: v.literal('ul'), items: v.array(v.array(inline)) }),
  ]),
);
const dateRange: v.GenericSchema<unknown, DateRange> = v.strictObject({
  start: v.exactOptional(partialDate),
  end: v.exactOptional(v.union([v.literal('present'), partialDate])),
});
const tag: v.GenericSchema<unknown, Tag> = v.strictObject({
  name: v.string(),
  level: v.exactOptional(v.picklist([1, 2, 3, 4, 5])),
});
const contact: v.GenericSchema<unknown, Contact> = v.strictObject({
  kind: v.picklist(CONTACT_KINDS),
  text: v.string(),
  href: v.exactOptional(safeUrl),
});
const fieldValue: v.GenericSchema<unknown, FieldValue> = v.union([
  v.null(),
  v.string(),
  richText,
  v.array(contact),
  v.array(tag),
  dateRange,
]);

const section: v.GenericSchema<unknown, Section> = v.strictObject({
  id: id<SectionId>(),
  kind: id<SectionKind>(),
  title: v.exactOptional(v.string()),
  custom: v.exactOptional(
    v.strictObject({
      shape: v.picklist(['entries', 'tags', 'prose']),
      // Icon names are validated against the registry by the editor when shown; unknown names render no icon.
      icon: v.exactOptional(v.pipe(v.string(), v.transform((s) => s as never))),
    }),
  ),
  itemOrder: v.array(id<ItemId>()),
});
const item: v.GenericSchema<unknown, Item> = v.strictObject({
  id: id<ItemId>(),
  sectionId: id<SectionId>(),
  data: v.record(v.string(), fieldValue),
});

const oklch = v.strictObject({ l: v.number(), c: v.number(), h: v.number() });
const logoPalette: v.GenericSchema<unknown, LogoPalette> = v.pipe(
  v.strictObject({
    swatches: v.array(v.strictObject({ color: oklch, weight: v.number(), isGround: v.boolean() })),
    source: v.picklist(['logo', 'site-hint', 'fallback']),
  }),
  // Rehydrating a palette that a minter (worker or fallback) produced before it was saved.
  v.transform((p): LogoPalette => {
    const unbranded: { readonly swatches: readonly Swatch[]; readonly source: LogoPalette['source'] } = p;
    return unbranded as LogoPalette;
  }),
);
const brand: v.GenericSchema<unknown, BrandProfile> = v.strictObject({
  name: v.string(),
  domain: v.exactOptional(id<Domain>()),
  logo: v.exactOptional(v.strictObject({ dataUrl, width: v.number(), height: v.number() })),
  palette: logoPalette,
  siteDark: v.exactOptional(v.boolean()),
  fetchedAt: v.number(),
});
const swatchPick = v.union([v.number(), v.picklist(['most-chromatic', 'most-weighted', 'darkest', 'lightest', 'ground'])]);
const roles: v.GenericSchema<unknown, RoleChoice> = v.strictObject({
  ground: swatchPick,
  accent: swatchPick,
  secondary: v.exactOptional(swatchPick),
  boost: v.picklist([0, 1]),
});
const themeBase: v.GenericSchema<unknown, ThemeBaseRef> = v.variant('kind', [
  v.strictObject({ kind: v.literal('auto') }),
  v.strictObject({ kind: v.literal('archetype'), id: v.picklist(['ats-plain', 'classic', 'sidebar', 'app-ui']) }),
  v.strictObject({ kind: v.literal('preset'), id: v.string() }),
]);
const customization: v.GenericSchema<unknown, Customization> = v.strictObject({
  fontPair: v.exactOptional(id<FontPairId>()),
  fontScale: v.picklist([0.9, 0.95, 1, 1.05, 1.1]),
  lineHeight: v.picklist(['tight', 'normal', 'relaxed']),
  sectionGap: v.picklist(['compact', 'normal', 'airy']),
  page: v.picklist(['A4', 'Letter']),
  marginsMm: v.picklist([10, 15, 20, 25]),
  showLogo: v.boolean(),
  icons: v.strictObject({ contact: v.boolean(), headings: v.boolean(), bullets: v.boolean(), style: v.picklist(['line', 'badge']) }),
});
const variant: v.GenericSchema<unknown, Variant> = v.strictObject({
  id: id<VariantId>(),
  label: v.string(),
  brand,
  themeBase,
  roles,
  customization,
  hidden: v.array(id<NodeId>()),
});

export const documentSchema: v.GenericSchema<unknown, ResumeDocument> = v.strictObject({
  id: id<ResumeId>(),
  name: v.string(),
  lang: v.string(),
  sections: v.record(v.string(), section),
  items: v.record(v.string(), item),
  sectionOrder: v.array(id<SectionId>()),
  variants: v.record(v.string(), variant),
  variantOrder: v.array(id<VariantId>()),
  activeVariant: id<VariantId>(),
  rev: v.pipe(v.number(), v.integer(), v.minValue(0)),
});

/** Current on-disk record version. Bump it and add a step to MIGRATIONS when the shape changes. */
export const RECORD_VERSION = 1;

export const recordSchema = v.strictObject({
  id: v.string(),
  v: v.literal(RECORD_VERSION),
  savedAt: v.number(),
  doc: documentSchema,
});
export type ResumeRecord = v.InferOutput<typeof recordSchema>;

/** Record migrations, keyed by the version they upgrade FROM. Each returns the next version's raw record. */
export const MIGRATIONS: Readonly<Record<number, (raw: Record<string, unknown>) => Record<string, unknown>>> = {};
