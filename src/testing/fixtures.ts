import { fallbackProfile } from '@/brand';
import {
  applyCommand,
  createDocument,
  type Command,
  type ItemId,
  type ResumeDocument,
  type ResumeId,
  type SectionId,
  type SectionKind,
  type VariantId,
} from '@/domain';

export interface BuiltDocument {
  readonly doc: ResumeDocument;
  readonly ids: {
    readonly resume: ResumeId;
    readonly variants: readonly [VariantId, VariantId];
    readonly sections: readonly SectionId[];
    readonly items: readonly ItemId[];
  };
}

const kind = (k: string) => k as SectionKind;

/** A deterministic brand snapshot (name-hash fallback palette). */
export const testBrand = (name: string) => fallbackProfile({ name, now: 0 });

/**
 * A small deterministic document: 3 sections (experience ×2 items, skills ×1, summary ×1)
 * and 2 variants. Built only with public commands, so it is valid by construction.
 */
export function buildDocument(): BuiltDocument {
  const resume = 'resume-1' as ResumeId;
  const variants = ['variant-a' as VariantId, 'variant-b' as VariantId] as const;
  const sections = ['sec-exp' as SectionId, 'sec-skills' as SectionId, 'sec-summary' as SectionId];
  const items = ['item-exp-1' as ItemId, 'item-exp-2' as ItemId, 'item-skills-1' as ItemId, 'item-summary-1' as ItemId];
  const base = createDocument({
    id: resume,
    name: 'My resume',
    lang: 'en',
    variant: { id: variants[0], brand: fallbackProfile({ name: 'General', now: 0 }) },
  });
  const cmds: Command[] = [
    { type: 'section/create', sectionId: sections[0]!, kind: kind('experience'), atIndex: 0 },
    { type: 'section/create', sectionId: sections[1]!, kind: kind('skills'), atIndex: 1 },
    { type: 'section/create', sectionId: sections[2]!, kind: kind('summary'), atIndex: 2 },
    { type: 'item/create', sectionId: sections[0]!, itemId: items[0]!, atIndex: 0 },
    { type: 'item/create', sectionId: sections[0]!, itemId: items[1]!, atIndex: 1 },
    { type: 'item/create', sectionId: sections[1]!, itemId: items[2]!, atIndex: 0 },
    { type: 'item/create', sectionId: sections[2]!, itemId: items[3]!, atIndex: 0 },
    { type: 'item/set', itemId: items[0]!, field: 'role', value: 'Lead Engineer' },
    { type: 'item/set', itemId: items[1]!, field: 'role', value: 'Software Engineer' },
    {
      type: 'variant/create',
      variantId: variants[1],
      target: fallbackProfile({ name: 'Experian', now: 0 }),
      base: { kind: 'auto' },
    },
  ];
  return { doc: cmds.reduce(applyCommand, base), ids: { resume, variants, sections, items } };
}
