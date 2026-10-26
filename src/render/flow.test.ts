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

  it('uses the persona’s heading words for sections the user did not rename (M4b)', () => {
    const { doc, ids } = buildDocument();
    const persona = { industry: 'technology', tone: 'bold', vocab: 'builder', centerpiece: 'none', source: 'rules' } as const;
    const withPersona = applyCommand(doc, { type: 'variant/setPersona', variantId: ids.variants[0], persona });
    expect(flowOf(withPersona).map((b) => b.view.heading)).toEqual(['What I’ve built', 'Toolbox', 'Summary']);
    const renamed = applyCommand(withPersona, { type: 'section/rename', sectionId: ids.sections[1]!, title: 'Tools' });
    expect(flowOf(renamed)[1]!.view.heading).toBe('Tools');
    const off = applyCommand(withPersona, { type: 'variant/setPersona', variantId: ids.variants[0], persona: null });
    expect(flowOf(off).map((b) => b.view.heading)).toEqual(['Experience', 'Skills', 'Summary']);
  });

  it('sends the theme’s side kinds to the side column with the side block styles (sidebar, app-ui)', () => {
    const { doc, ids } = buildDocument();
    const v = ids.variants[0];
    const sidebar = applyCommand(doc, { type: 'variant/setBase', variantId: v, base: { kind: 'archetype', id: 'app-ui' } });
    const flow = flowOf(sidebar, v);
    expect(flow.map((b) => [b.view.heading, b.region])).toEqual([
      ['Experience', 'main'],
      ['Skills', 'side'],
      ['Summary', 'main'],
    ]);
    expect(flow.find((b) => b.view.shape === 'entries')?.view.style).toBe('card');
    expect(flowOf(doc, v).every((b) => b.region === 'main')).toBe(true);
  });

  it('resolves icon settings into icon names: heading icons from the section, bullets flag, line or badge', () => {
    const { doc, ids } = buildDocument();
    const v = ids.variants[0];
    const on = applyCommand(doc, {
      type: 'variant/customize',
      variantId: v,
      patch: { icons: { contact: false, headings: true, bullets: true, style: 'badge' } },
    });
    const icons = flowOf(on, v).map((b) => b.view.icons);
    expect(icons.every((i) => i?.style === 'badge' && i.bullets === true && typeof i.heading === 'string')).toBe(true);
    const off = applyCommand(doc, { type: 'variant/customize', variantId: v, patch: { icons: { contact: false, headings: false, bullets: false, style: 'line' } } });
    expect(flowOf(off, v).every((b) => b.view.icons === undefined)).toBe(true);
  });
});
