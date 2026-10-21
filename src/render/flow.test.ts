import { describe, expect, it } from 'vitest';
import { applyCommand, resolveView, type SectionId, type SectionKind } from '@/domain';
import { buildDocument } from '@/testing';
import { resolveTheme } from '@/themes';
import { buildFlow } from './flow';

function flowOf(doc: ReturnType<typeof buildDocument>['doc'], variant = buildDocument().ids.variants[0]) {
  const view = resolveView(doc, variant);
  return buildFlow(view, resolveTheme(view.variant));
}

describe('buildFlow', () => {
  it('makes one block per visible section, in order, with the theme block style and the section label', () => {
    const { doc, ids } = buildDocument();
    const flow = flowOf(doc);
    expect(flow.map((b) => [b.key, b.view.shape, b.view.heading])).toEqual([
      [ids.sections[0], 'entries', 'Experience'],
      [ids.sections[1], 'tags', 'Skills'],
      [ids.sections[2], 'prose', 'Summary'],
    ]);
    const exp = flow[0]!.view;
    expect(exp.shape === 'entries' && exp.content.map((e) => e.title)).toEqual(['Lead Engineer', 'Software Engineer']);
    expect(exp.style).toBe(resolveTheme(resolveView(doc, ids.variants[0]).variant).base.blocks.entries);
  });

  it('skips hidden sections and sections with nothing to show', () => {
    const { doc, ids } = buildDocument();
    const hidden = applyCommand(doc, { type: 'visibility/set', variantId: ids.variants[0], node: ids.sections[1]!, hidden: true });
    const withEmpty = applyCommand(hidden, { type: 'section/create', sectionId: 'sec-empty' as SectionId, kind: 'projects' as SectionKind, atIndex: 0 });
    expect(flowOf(withEmpty).map((b) => b.key)).toEqual([ids.sections[0], ids.sections[2]]);
  });

  it('changes a block’s content hash only when what it draws changes', () => {
    const { doc, ids } = buildDocument();
    const before = flowOf(doc);
    const edited = flowOf(applyCommand(doc, { type: 'item/set', itemId: ids.items[0]!, field: 'role', value: 'Staff Engineer' }));
    expect(edited[0]!.contentHash).not.toBe(before[0]!.contentHash);
    expect(edited.slice(1).map((b) => b.contentHash)).toEqual(before.slice(1).map((b) => b.contentHash));
    const renamed = flowOf(applyCommand(doc, { type: 'section/rename', sectionId: ids.sections[1]!, title: 'Tools' }));
    expect(renamed[1]!.contentHash).not.toBe(before[1]!.contentHash);
  });
});
