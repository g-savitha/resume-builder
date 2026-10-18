import type { Item, ResumeDocument, Section, Variant, VariantId } from './model';

/** Visibility-filtered read model for one variant. Memoized per (doc identity, variantId) by the store selector. */
export interface ResumeView {
  readonly lang: string;
  /** "Resume name – Variant label" → document.title → PDF Title. */
  readonly title: string;
  readonly sections: readonly { readonly section: Section; readonly items: readonly Item[] }[];
  readonly variant: Variant;
}

/** Falls back to the active variant when `variantId` is unknown (e.g. deleted in another view). */
export function resolveView(doc: ResumeDocument, variantId: VariantId): ResumeView {
  const variant = doc.variants[variantId] ?? doc.variants[doc.activeVariant];
  if (!variant) throw new Error(`Document ${doc.id} has no variants`); // unreachable: invariant ≥1 variant
  const hidden = new Set<string>(variant.hidden);
  const sections = doc.sectionOrder.flatMap((id) => {
    const section = doc.sections[id];
    if (!section || hidden.has(id)) return [];
    const items = section.itemOrder.flatMap((itemId) => {
      const item = doc.items[itemId];
      return item && !hidden.has(itemId) ? [item] : [];
    });
    return [{ section, items }];
  });
  return { lang: doc.lang, title: `${doc.name} – ${variant.label}`, sections, variant };
}
