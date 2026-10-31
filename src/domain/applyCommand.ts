import type { RoleChoice, SwatchPick } from './brand';
import type { Command } from './commands';
import { deepEqual } from './equal';
import {
  DEFAULT_CUSTOMIZATION,
  DEFAULT_ROLES,
  type Customization,
  type Item,
  type ItemId,
  type NodeId,
  type ResumeDocument,
  type Section,
  type SectionId,
  type Variant,
  type VariantId,
} from './model';

/**
 * Pure reducer with structural sharing (untouched sections/items keep identity → memo hits).
 * Invariants: order arrays contain exactly the existing ids; hidden sorted+unique; ≥1 variant; activeVariant exists;
 * rev bumps only on change. Same command twice → identical document (the second returns its input unchanged).
 */
export function applyCommand(doc: ResumeDocument, cmd: Command): ResumeDocument {
  const next = reduce(doc, cmd);
  return next === doc ? doc : { ...next, rev: doc.rev + 1 };
}

function reduce(doc: ResumeDocument, cmd: Command): ResumeDocument {
  switch (cmd.type) {
    case 'item/set': {
      const item = doc.items[cmd.itemId];
      if (!item || deepEqual(item.data[cmd.field], cmd.value)) return doc;
      const data = { ...item.data, [cmd.field]: cmd.value };
      return putItem(doc, { ...item, data });
    }
    case 'item/create': {
      const section = doc.sections[cmd.sectionId];
      if (!section || doc.items[cmd.itemId]) return doc;
      const item: Item = { id: cmd.itemId, sectionId: section.id, data: {} };
      const withItem = { ...doc, items: { ...doc.items, [item.id]: item } };
      return putSection(withItem, { ...section, itemOrder: insertAt(section.itemOrder, item.id, cmd.atIndex) });
    }
    case 'item/delete': {
      const item = doc.items[cmd.itemId];
      if (!item) return doc;
      const items: Record<ItemId, Item> = { ...doc.items };
      delete items[item.id];
      const next = { ...doc, items };
      const section = doc.sections[item.sectionId];
      const withOrder = section ? putSection(next, { ...section, itemOrder: without(section.itemOrder, item.id) }) : next;
      return unhide(withOrder, new Set<NodeId>([item.id]));
    }
    case 'item/move': {
      const item = doc.items[cmd.itemId];
      const from = item ? doc.sections[item.sectionId] : undefined;
      const to = doc.sections[cmd.toSection];
      if (!item || !from || !to) return doc;
      if (from.id === to.id) {
        const order = moveTo(from.itemOrder, item.id, cmd.toIndex);
        return order === from.itemOrder ? doc : putSection(doc, { ...from, itemOrder: order });
      }
      const moved = putItem(doc, { ...item, sectionId: to.id });
      const removed = putSection(moved, { ...from, itemOrder: without(from.itemOrder, item.id) });
      return putSection(removed, { ...to, itemOrder: insertAt(to.itemOrder, item.id, cmd.toIndex) });
    }
    case 'section/create': {
      if (doc.sections[cmd.sectionId]) return doc;
      const section: Section = {
        id: cmd.sectionId,
        kind: cmd.kind,
        itemOrder: [],
        ...(cmd.custom ? { custom: cmd.custom } : {}),
      };
      return {
        ...doc,
        sections: { ...doc.sections, [section.id]: section },
        sectionOrder: insertAt(doc.sectionOrder, section.id, cmd.atIndex),
      };
    }
    case 'section/delete': {
      const section = doc.sections[cmd.sectionId];
      if (!section) return doc;
      const sections: Record<SectionId, Section> = { ...doc.sections };
      delete sections[section.id];
      const items: Record<ItemId, Item> = { ...doc.items };
      for (const id of section.itemOrder) delete items[id];
      const gone = new Set<NodeId>([section.id, ...section.itemOrder]);
      const next: ResumeDocument = { ...doc, sections, items, sectionOrder: without(doc.sectionOrder, section.id) };
      return unhide(next, gone);
    }
    case 'section/rename': {
      const section = doc.sections[cmd.sectionId];
      if (!section || section.title === cmd.title) return doc;
      const { title: _old, ...rest } = section;
      return putSection(doc, cmd.title === undefined ? rest : { ...rest, title: cmd.title });
    }
    case 'section/move': {
      if (!doc.sections[cmd.sectionId]) return doc;
      const order = moveTo(doc.sectionOrder, cmd.sectionId, cmd.toIndex);
      return order === doc.sectionOrder ? doc : { ...doc, sectionOrder: order };
    }
    case 'visibility/set': {
      const variant = doc.variants[cmd.variantId];
      const exists = Object.hasOwn(doc.sections, cmd.node) || Object.hasOwn(doc.items, cmd.node);
      if (!variant || !exists) return doc;
      const isHidden = variant.hidden.includes(cmd.node);
      if (isHidden === cmd.hidden) return doc;
      const hidden = cmd.hidden ? sortedUnique([...variant.hidden, cmd.node]) : without(variant.hidden, cmd.node);
      return putVariant(doc, { ...variant, hidden });
    }
    case 'variant/create': {
      if (doc.variants[cmd.variantId]) return doc;
      const source = cmd.copyFrom ? doc.variants[cmd.copyFrom] : undefined;
      const variant: Variant = {
        id: cmd.variantId,
        label: cmd.target.name,
        brand: cmd.target,
        themeBase: cmd.base,
        // TODO(M3): roles := preset roleHints once themes/ exists; strategies until then.
        roles: DEFAULT_ROLES,
        customization: source?.customization ?? DEFAULT_CUSTOMIZATION,
        hidden: source?.hidden ?? [],
      };
      return {
        ...doc,
        variants: { ...doc.variants, [variant.id]: variant },
        variantOrder: [...doc.variantOrder, variant.id],
      };
    }
    case 'variant/select': {
      if (!doc.variants[cmd.variantId] || doc.activeVariant === cmd.variantId) return doc;
      return { ...doc, activeVariant: cmd.variantId };
    }
    case 'variant/refreshBrand': {
      const variant = doc.variants[cmd.variantId];
      if (!variant || deepEqual(variant.brand, cmd.target)) return doc;
      return putVariant(doc, { ...variant, brand: cmd.target, roles: resetIndexPicks(variant.roles) });
    }
    case 'variant/customize': {
      const variant = doc.variants[cmd.variantId];
      if (!variant) return doc;
      const { fontPair, multiColor, ...rest } = cmd.patch;
      const { fontPair: oldPair, multiColor: oldMulti, ...kept } = { ...variant.customization, ...rest };
      const pair = fontPair === null ? undefined : (fontPair ?? oldPair);
      // Off is stored as absent, so a resume that never turned it on keeps its exact shape.
      const multi = (multiColor ?? oldMulti === true) ? ({ multiColor: true } as const) : {};
      const customization: Customization = { ...kept, ...(pair === undefined ? {} : { fontPair: pair }), ...multi };
      if (deepEqual(customization, variant.customization)) return doc;
      return putVariant(doc, { ...variant, customization });
    }
    case 'variant/setRoles': {
      const variant = doc.variants[cmd.variantId];
      if (!variant || deepEqual(variant.roles, cmd.roles)) return doc;
      return putVariant(doc, { ...variant, roles: cmd.roles });
    }
    case 'variant/setBase': {
      const variant = doc.variants[cmd.variantId];
      if (!variant || deepEqual(variant.themeBase, cmd.base)) return doc;
      return putVariant(doc, { ...variant, themeBase: cmd.base });
    }
    case 'variant/setPersona': {
      const variant = doc.variants[cmd.variantId];
      if (!variant || deepEqual(variant.persona ?? null, cmd.persona)) return doc;
      const { persona: _old, ...rest } = variant;
      return putVariant(doc, cmd.persona ? { ...rest, persona: cmd.persona } : rest);
    }
    case 'variant/delete': {
      if (!doc.variants[cmd.variantId] || doc.variantOrder.length <= 1) return doc;
      const variants: Record<VariantId, Variant> = { ...doc.variants };
      delete variants[cmd.variantId];
      const variantOrder = without(doc.variantOrder, cmd.variantId);
      const [first] = variantOrder;
      const activeVariant = doc.activeVariant === cmd.variantId && first ? first : doc.activeVariant;
      return { ...doc, variants, variantOrder, activeVariant };
    }
    default: {
      const _exhaustive: never = cmd;
      return _exhaustive;
    }
  }
}

/* ── helpers (pure, structural sharing) ── */

function putItem(doc: ResumeDocument, item: Item): ResumeDocument {
  return { ...doc, items: { ...doc.items, [item.id]: item } };
}
function putSection(doc: ResumeDocument, section: Section): ResumeDocument {
  return { ...doc, sections: { ...doc.sections, [section.id]: section } };
}
function putVariant(doc: ResumeDocument, variant: Variant): ResumeDocument {
  return { ...doc, variants: { ...doc.variants, [variant.id]: variant } };
}

function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return length;
  return Math.max(0, Math.min(length, Math.trunc(index)));
}
function insertAt<T>(list: readonly T[], value: T, index: number): readonly T[] {
  const i = clampIndex(index, list.length);
  return [...list.slice(0, i), value, ...list.slice(i)];
}
function without<T>(list: readonly T[], value: T): readonly T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : list;
}
/** Moves `value` so that it ends at `toIndex` (clamped). Returns the same array when nothing moves. */
function moveTo<T>(list: readonly T[], value: T, toIndex: number): readonly T[] {
  const from = list.indexOf(value);
  if (from < 0) return list;
  const rest = list.filter((v) => v !== value);
  const to = clampIndex(toIndex, rest.length);
  return to === from ? list : [...rest.slice(0, to), value, ...rest.slice(to)];
}
function sortedUnique<T extends string>(list: readonly T[]): readonly T[] {
  return [...new Set(list)].sort();
}

/** Drops removed nodes from every variant's hidden list. */
function unhide(doc: ResumeDocument, gone: ReadonlySet<NodeId>): ResumeDocument {
  let variants: Record<VariantId, Variant> | undefined;
  for (const id of doc.variantOrder) {
    const variant = doc.variants[id];
    if (!variant?.hidden.some((n) => gone.has(n))) continue;
    variants ??= { ...doc.variants };
    variants[id] = { ...variant, hidden: variant.hidden.filter((n) => !gone.has(n)) };
  }
  return variants ? { ...doc, variants } : doc;
}

function strategyFor(pick: SwatchPick, fallback: Exclude<SwatchPick, number>): Exclude<SwatchPick, number> {
  return typeof pick === 'number' ? fallback : pick;
}
/** After a brand refresh, numeric swatch indices may point at different colors: reset them to strategies. */
function resetIndexPicks(roles: RoleChoice): RoleChoice {
  const { secondary, ...rest } = roles;
  return {
    ...rest,
    ground: strategyFor(roles.ground, 'ground'),
    accent: strategyFor(roles.accent, 'most-chromatic'),
    ...(secondary === undefined ? {} : { secondary: strategyFor(secondary, 'most-weighted') }),
  };
}
