import type { Item, Section, SectionKind, ShapeContent, ShapeName } from '@/domain';
import { isSectionDef, readItem } from './kit';
import type { SectionDef } from './types';

/**
 * THE list of section kinds: every `sections/<kind>/section.ts`, keyed by folder name.
 * Adding a kind = adding a folder. Nothing else to edit.
 */
const modules = import.meta.glob<unknown>('./*/section.ts', { eager: true, import: 'default' });

function kindFromPath(path: string): SectionKind {
  const match = /^\.\/([a-z][a-z0-9-]*)\/section\.ts$/.exec(path);
  if (!match?.[1]) throw new Error(`Section folder name must be kebab-case: ${path}`);
  return match[1] as SectionKind;
}

function buildRegistry(): ReadonlyMap<SectionKind, SectionDef> {
  const entries = Object.entries(modules).map(([path, def]): [SectionKind, SectionDef] => {
    if (!isSectionDef(def)) throw new Error(`${path} must \`export default defineSection({...})\``);
    return [kindFromPath(path), def];
  });
  return new Map(entries);
}

export const sectionRegistry: ReadonlyMap<SectionKind, SectionDef> = buildRegistry();

/** Narrows a stored or user-supplied string to a registered kind. */
export function parseSectionKind(value: string): SectionKind | null {
  for (const kind of sectionRegistry.keys()) if (kind === value) return kind;
  return null;
}

export function sectionDef(kind: SectionKind): SectionDef | undefined {
  return sectionRegistry.get(kind);
}

/** The label shown for a section: the user's title, else the kind's default label. (Theme vocab joins in M3.) */
export function sectionLabel(section: Section): string {
  const title = section.title?.trim();
  if (title) return title;
  return sectionRegistry.get(section.kind)?.defaultLabel ?? 'Section';
}

export type Projected = { [S in ShapeName]: { readonly shape: S; readonly content: ShapeContent[S] } }[ShapeName];

const projectionCache = new WeakMap<Item, Projected>();

/** Projects an item to its section's shape. Memoized per item identity (items are immutable). */
export function projectItem(section: Section, item: Item): Projected | null {
  const cached = projectionCache.get(item);
  if (cached) return cached;
  const def = sectionRegistry.get(section.kind);
  if (!def) return null;
  const projected = { shape: def.shape, content: def.project(readItem(def, item.data)) } as Projected;
  projectionCache.set(item, projected);
  return projected;
}

/** Text that names an item in lists and announcements ("Lead Engineer"), or a numbered fallback. */
export function itemTitle(section: Section, item: Item, index: number): string {
  const def = sectionRegistry.get(section.kind);
  if (def) {
    const field = def.titleField ?? Object.keys(def.item).find((k) => def.item[k]?.k === 'text');
    const value = field ? item.data[field] : undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return `Entry ${index + 1}`;
}
