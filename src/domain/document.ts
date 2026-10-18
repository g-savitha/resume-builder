import type { BrandProfile, ThemeBaseRef } from './brand';
import {
  DEFAULT_CUSTOMIZATION,
  DEFAULT_ROLES,
  type Item,
  type ItemId,
  type NodeId,
  type ResumeDocument,
  type ResumeId,
  type Section,
  type SectionId,
  type Variant,
  type VariantId,
} from './model';

export interface NewDocument {
  readonly id: ResumeId;
  readonly name: string;
  readonly lang: string;
  /** A document always has at least one variant. */
  readonly variant: { readonly id: VariantId; readonly brand: BrandProfile; readonly base?: ThemeBaseRef };
}

/** An empty resume with one variant. Content is added with commands. */
export function createDocument({ id, name, lang, variant }: NewDocument): ResumeDocument {
  const first: Variant = {
    id: variant.id,
    label: variant.brand.name,
    brand: variant.brand,
    themeBase: variant.base ?? { kind: 'auto' },
    roles: DEFAULT_ROLES,
    customization: DEFAULT_CUSTOMIZATION,
    hidden: [],
  };
  return {
    id,
    name,
    lang,
    sections: {},
    items: {},
    sectionOrder: [],
    variants: { [first.id]: first },
    variantOrder: [first.id],
    activeVariant: first.id,
    rev: 0,
  };
}

/** Every broken invariant, as readable messages. Empty means the document is well-formed. */
export function checkInvariants(doc: ResumeDocument): readonly string[] {
  const problems: string[] = [];
  const sameSet = (name: string, order: readonly string[], keys: readonly string[]) => {
    if (new Set(order).size !== order.length) problems.push(`${name} has duplicates`);
    const a = [...order].sort().join();
    const b = [...keys].sort().join();
    if (a !== b) problems.push(`${name} does not match its records`);
  };
  sameSet('sectionOrder', doc.sectionOrder, Object.keys(doc.sections));
  sameSet('variantOrder', doc.variantOrder, Object.keys(doc.variants));
  const ordered: string[] = [];
  for (const section of Object.values<Section>(doc.sections)) {
    for (const itemId of section.itemOrder) {
      ordered.push(itemId);
      if (doc.items[itemId]?.sectionId !== section.id) problems.push(`item ${itemId} is not owned by ${section.id}`);
    }
  }
  sameSet('itemOrder (all sections)', ordered, Object.keys(doc.items));
  if (doc.variantOrder.length === 0) problems.push('no variants');
  if (!doc.variants[doc.activeVariant]) problems.push('activeVariant missing');
  for (const variant of Object.values<Variant>(doc.variants)) {
    const sorted = [...new Set(variant.hidden)].sort();
    if (sorted.join() !== variant.hidden.join()) problems.push(`variant ${variant.id} hidden not sorted+unique`);
    for (const node of variant.hidden) {
      if (!Object.hasOwn(doc.sections, node) && !Object.hasOwn(doc.items, node)) {
        problems.push(`variant ${variant.id} hides missing node ${node}`);
      }
    }
  }
  return problems;
}

/**
 * Repairs a structurally valid but inconsistent document (e.g. from an older build or a partial write):
 * drops dangling ids, appends orphans in a stable order, sorts hidden, fixes activeVariant.
 * Returns the input unchanged when it already satisfies every invariant. Used at the storage/import boundary.
 */
export function normalizeDocument(doc: ResumeDocument): ResumeDocument {
  if (checkInvariants(doc).length === 0) return doc;
  const sections: Record<SectionId, Section> = {};
  const items: Record<ItemId, Item> = {};
  const placed = new Set<string>();
  const sectionOrder = uniqueExisting(
    [...doc.sectionOrder, ...Object.keys(doc.sections)],
    (id): id is SectionId => Object.hasOwn(doc.sections, id),
  );
  for (const sectionId of sectionOrder) {
    const section = doc.sections[sectionId];
    if (!section) continue;
    const owned = Object.values<Item>(doc.items).filter((it) => it.sectionId === sectionId).map((it) => it.id);
    const itemOrder = uniqueExisting(
      [...section.itemOrder, ...owned],
      (id): id is ItemId => doc.items[id as ItemId]?.sectionId === sectionId && !placed.has(id),
    );
    for (const id of itemOrder) {
      const item = doc.items[id];
      if (item) items[id] = item;
      placed.add(id);
    }
    sections[sectionId] = { ...section, itemOrder };
  }
  const variantOrder = uniqueExisting(
    [...doc.variantOrder, ...Object.keys(doc.variants)],
    (id): id is VariantId => Object.hasOwn(doc.variants, id),
  );
  const variants: Record<VariantId, Variant> = {};
  for (const id of variantOrder) {
    const v = doc.variants[id];
    if (!v) continue;
    const hidden = [...new Set(v.hidden)]
      .filter((n): n is NodeId => Object.hasOwn(sections, n) || Object.hasOwn(items, n))
      .sort();
    variants[id] = { ...v, hidden };
  }
  const [firstVariant] = variantOrder;
  const activeVariant = variants[doc.activeVariant] || !firstVariant ? doc.activeVariant : firstVariant;
  return { ...doc, sections, items, sectionOrder, variants, variantOrder, activeVariant };
}

function uniqueExisting<T extends string>(ids: readonly string[], keep: (id: string) => id is T): T[] {
  return [...new Set(ids)].filter(keep);
}
