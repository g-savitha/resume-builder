import { parseSafeUrl } from '@/domain';
import type { Contact, DateRange, EntryContent, FieldValue, RichText, ShapeName, Tag, TagGroupContent } from '@/domain';
import type { FieldSpec, ItemData, SectionDef, ValueOf } from './types';

type Opts<K extends FieldSpec['k']> = Omit<Extract<FieldSpec, { k: K }>, 'k' | 'label'>;

/** Field spec builders: `f.text('Role', { required: true })`. The label is always the first argument. */
export const f = {
  text: (label: string, opts: Opts<'text'> = {}) => ({ k: 'text', label, ...opts }) as const,
  rich: (label: string, opts: Opts<'rich'> = {}) => ({ k: 'rich', label, ...opts }) as const,
  dateRange: (label: string) => ({ k: 'dateRange', label }) as const,
  url: (label: string, opts: Opts<'url'> = {}) => ({ k: 'url', label, ...opts }) as const,
  tags: (label: string, opts: Opts<'tags'> = {}) => ({ k: 'tags', label, ...opts }) as const,
  contacts: (label: string) => ({ k: 'contacts', label }) as const,
  image: (label: string) => ({ k: 'image', label }) as const,
};

const defined = new WeakSet<object>();

/** Declares a section kind. Export it as the default of `sections/<kind>/section.ts`; the folder name is the kind. */
export function defineSection<const Fs extends Record<string, FieldSpec>, const S extends ShapeName>(def: SectionDef<Fs, S>): SectionDef<Fs, S> {
  defined.add(def);
  return def;
}

/** True only for values produced by defineSection (used to validate the folder glob). */
export function isSectionDef(value: unknown): value is SectionDef {
  return typeof value === 'object' && value !== null && defined.has(value);
}

/* ── reading stored item data through a spec (the trust boundary between FieldValue and typed fields) ── */

const EMPTY_RICH: RichText = [];
const EMPTY_TAGS: readonly Tag[] = [];
const EMPTY_CONTACTS: readonly Contact[] = [];
const EMPTY_RANGE: DateRange = {};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isRich = (v: FieldValue): v is RichText => Array.isArray(v) && v.every((b) => isObject(b) && (b.t === 'p' || b.t === 'ul'));
const isTags = (v: FieldValue): v is readonly Tag[] => Array.isArray(v) && v.every((t) => isObject(t) && typeof t.name === 'string' && !('kind' in t));
const isContacts = (v: FieldValue): v is readonly Contact[] =>
  Array.isArray(v) && v.every((c) => isObject(c) && typeof c.kind === 'string' && typeof c.text === 'string');
const isRange = (v: FieldValue): v is DateRange => isObject(v) && !Array.isArray(v);

/**
 * The value a field holds, typed by its spec. Missing or mismatched values read as the spec's empty value,
 * so forms and projections never see `undefined`. Values were validated when they entered (editor/storage).
 */
export function readField<F extends FieldSpec>(spec: F, value: FieldValue | undefined): ValueOf<F>;
export function readField(spec: FieldSpec, value: FieldValue | undefined): FieldValue {
  const v = value ?? null;
  switch (spec.k) {
    case 'text':
    case 'url':
      return typeof v === 'string' ? v : '';
    case 'rich':
      return v !== null && isRich(v) ? v : EMPTY_RICH;
    case 'dateRange':
      return v !== null && isRange(v) ? v : EMPTY_RANGE;
    case 'tags':
      return v !== null && isTags(v) ? v : EMPTY_TAGS;
    case 'contacts':
      return v !== null && isContacts(v) ? v : EMPTY_CONTACTS;
    case 'image':
      return typeof v === 'string' && v.startsWith('data:image/') ? v : null;
    default: {
      const _exhaustive: never = spec;
      return _exhaustive;
    }
  }
}

/** All fields of an item, typed by the section's specs. */
export function readItem<Fs extends Record<string, FieldSpec>>(def: SectionDef<Fs>, data: Readonly<Record<string, FieldValue>>): ItemData<Fs> {
  const out: Record<string, FieldValue> = {};
  for (const [key, spec] of Object.entries(def.item)) out[key] = readField(spec, data[key]);
  return out as ItemData<Fs>;
}

/* ── projection helpers for section authors ── */

/** Builds EntryContent, omitting empty optional parts so themes never render blank rows. */
export function entry(parts: {
  readonly title: string;
  readonly subtitle?: string;
  readonly dates?: DateRange;
  readonly place?: string;
  readonly url?: string;
  readonly tags?: readonly Tag[];
  readonly body?: RichText;
}): EntryContent {
  const subtitle = parts.subtitle?.trim();
  const place = parts.place?.trim();
  const url = parts.url ? parseSafeUrl(parts.url) : null;
  const hasDates = parts.dates && (parts.dates.start !== undefined || parts.dates.end !== undefined);
  return {
    title: parts.title.trim(),
    ...(subtitle ? { subtitle } : {}),
    ...(hasDates ? { dates: parts.dates } : {}),
    ...(place ? { place } : {}),
    ...(url ? { url } : {}),
    tags: (parts.tags ?? []).map((t) => t.name),
    body: parts.body ?? [],
  };
}

export function tagGroup(label: string, tags: readonly Tag[]): TagGroupContent {
  const l = label.trim();
  return l ? { label: l, tags } : { tags };
}
