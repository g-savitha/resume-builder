import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildDocument, testBrand } from '@/testing';
import {
  applyCommand,
  checkInvariants,
  resolveView,
  type Command,
  type ItemId,
  type ResumeDocument,
  type SectionId,
  type SectionKind,
  type FontPairId,
  type VariantId,
} from '.';

const { doc, ids } = buildDocument();
const [expId, skillsId, summaryId] = ids.sections as [SectionId, SectionId, SectionId];
const [exp1, exp2, skills1] = ids.items as [ItemId, ItemId, ItemId, ItemId];
const [variantA, variantB] = ids.variants;
const run = (d: ResumeDocument, ...cmds: Command[]) => cmds.reduce(applyCommand, d);
const visibleSectionIds = (d: ResumeDocument, v: VariantId) => resolveView(d, v).sections.map((s) => s.section.id);

describe('applyCommand', () => {
  it('sets a field value and bumps rev once', () => {
    const next = applyCommand(doc, { type: 'item/set', itemId: exp1, field: 'company', value: 'Experian' });
    expect(next.items[exp1]?.data.company).toBe('Experian');
    expect(next.rev).toBe(doc.rev + 1);
  });

  it('returns the identical document when a command changes nothing', () => {
    const cmd: Command = { type: 'item/set', itemId: exp1, field: 'role', value: 'Lead Engineer' };
    expect(applyCommand(doc, cmd)).toBe(doc);
    expect(applyCommand(doc, { type: 'section/move', sectionId: expId, toIndex: 0 })).toBe(doc);
    expect(applyCommand(doc, { type: 'item/delete', itemId: 'nope' as ItemId })).toBe(doc);
  });

  it('keeps untouched sections and items by identity (structural sharing)', () => {
    const next = applyCommand(doc, { type: 'item/set', itemId: exp1, field: 'role', value: 'Staff Engineer' });
    expect(next.items[exp2]).toBe(doc.items[exp2]);
    expect(next.sections[skillsId]).toBe(doc.sections[skillsId]);
    expect(next.variants).toBe(doc.variants);
    expect(next.items[exp1]).not.toBe(doc.items[exp1]);
  });

  it('moves a section to a target index (clamped), the same command for drag and Move up/down', () => {
    expect(run(doc, { type: 'section/move', sectionId: summaryId, toIndex: 0 }).sectionOrder).toEqual([summaryId, expId, skillsId]);
    expect(run(doc, { type: 'section/move', sectionId: expId, toIndex: 99 }).sectionOrder).toEqual([skillsId, summaryId, expId]);
    expect(run(doc, { type: 'section/move', sectionId: skillsId, toIndex: -5 }).sectionOrder).toEqual([skillsId, expId, summaryId]);
  });

  it('moves an item within and across sections', () => {
    const within = run(doc, { type: 'item/move', itemId: exp2, toSection: expId, toIndex: 0 });
    expect(within.sections[expId]?.itemOrder).toEqual([exp2, exp1]);

    const across = run(doc, { type: 'item/move', itemId: exp1, toSection: skillsId, toIndex: 0 });
    expect(across.sections[expId]?.itemOrder).toEqual([exp2]);
    expect(across.sections[skillsId]?.itemOrder).toEqual([exp1, skills1]);
    expect(across.items[exp1]?.sectionId).toBe(skillsId);
  });

  it('hides a node in one variant only', () => {
    const next = run(doc, { type: 'visibility/set', variantId: variantB, node: skillsId, hidden: true });
    expect(visibleSectionIds(next, variantB)).toEqual([expId, summaryId]);
    expect(visibleSectionIds(next, variantA)).toEqual([expId, skillsId, summaryId]);
    const shown = run(next, { type: 'visibility/set', variantId: variantB, node: skillsId, hidden: false });
    expect(visibleSectionIds(shown, variantB)).toEqual([expId, skillsId, summaryId]);
  });

  it('hides individual items per variant', () => {
    const next = run(doc, { type: 'visibility/set', variantId: variantA, node: exp1, hidden: true });
    const view = resolveView(next, variantA);
    expect(view.sections[0]?.items.map((i) => i.id)).toEqual([exp2]);
    expect(resolveView(next, variantB).sections[0]?.items.map((i) => i.id)).toEqual([exp1, exp2]);
  });

  it('deleting a section removes its items and every variant’s hide entries for them', () => {
    const next = run(
      doc,
      { type: 'visibility/set', variantId: variantA, node: exp1, hidden: true },
      { type: 'visibility/set', variantId: variantB, node: expId, hidden: true },
      { type: 'section/delete', sectionId: expId },
    );
    expect(next.items[exp1]).toBeUndefined();
    expect(next.items[exp2]).toBeUndefined();
    expect(next.variants[variantA]?.hidden).toEqual([]);
    expect(next.variants[variantB]?.hidden).toEqual([]);
    expect(checkInvariants(next)).toEqual([]);
  });

  it('never deletes the last variant, and reassigns the active one', () => {
    const selected = run(doc, { type: 'variant/select', variantId: variantB });
    const oneLeft = run(selected, { type: 'variant/delete', variantId: variantB });
    expect(oneLeft.variantOrder).toEqual([variantA]);
    expect(oneLeft.activeVariant).toBe(variantA);
    expect(run(oneLeft, { type: 'variant/delete', variantId: variantA })).toBe(oneLeft);
  });

  it('new variants copy hide state from copyFrom, not from the active variant', () => {
    const hidden = run(doc, { type: 'visibility/set', variantId: variantB, node: skillsId, hidden: true });
    const target = testBrand('Microsoft');
    const c = 'variant-c' as VariantId;
    const copied = run(hidden, { type: 'variant/create', variantId: c, target, base: { kind: 'auto' }, copyFrom: variantB });
    expect(copied.variants[c]?.hidden).toEqual([skillsId]);
    expect(copied.variants[c]?.label).toBe('Microsoft');
  });

  it('brand refresh resets numeric swatch picks to strategies (indices may now be stale)', () => {
    const picked = run(doc, { type: 'variant/setRoles', variantId: variantA, roles: { ground: 2, accent: 1, secondary: 0, boost: 1 } });
    const refreshed = run(picked, { type: 'variant/refreshBrand', variantId: variantA, target: testBrand('General 2') });
    expect(refreshed.variants[variantA]?.roles).toEqual({ ground: 'ground', accent: 'most-chromatic', secondary: 'most-weighted', boost: 1 });
  });

  it('customize merges a patch, keeps the font pair unless told, and fontPair: null goes back to the theme font', () => {
    const serif = run(doc, { type: 'variant/customize', variantId: variantA, patch: { fontPair: 'serif' as FontPairId, page: 'Letter' } });
    const sized = run(serif, { type: 'variant/customize', variantId: variantA, patch: { fontScale: 1.1 } });
    expect(sized.variants[variantA]?.customization).toMatchObject({ fontPair: 'serif', page: 'Letter', fontScale: 1.1 });
    const reset = run(sized, { type: 'variant/customize', variantId: variantA, patch: { fontPair: null } });
    expect(reset.variants[variantA]?.customization).not.toHaveProperty('fontPair');
    expect(run(reset, { type: 'variant/customize', variantId: variantA, patch: { fontPair: null } })).toBe(reset);
  });

  it('multi-colour brand is stored only while on, so turning it off restores the exact customization', () => {
    const before = doc.variants[variantA]?.customization;
    const on = run(doc, { type: 'variant/customize', variantId: variantA, patch: { multiColor: true } });
    expect(on.variants[variantA]?.customization.multiColor).toBe(true);
    const kept = run(on, { type: 'variant/customize', variantId: variantA, patch: { fontScale: 1.05 } });
    expect(kept.variants[variantA]?.customization.multiColor).toBe(true);
    const off = run(on, { type: 'variant/customize', variantId: variantA, patch: { multiColor: false } });
    expect(off.variants[variantA]?.customization).toEqual(before);
    expect(off.variants[variantA]?.customization).not.toHaveProperty('multiColor');
    expect(run(doc, { type: 'variant/customize', variantId: variantA, patch: { multiColor: false } })).toBe(doc);
  });
});

/* ── properties over random command sequences ── */

const KINDS = ['experience', 'skills', 'custom'] as SectionKind[];

function commandArb(d: ResumeDocument): fc.Arbitrary<Command> {
  const sectionIds = [...Object.keys(d.sections), 'sec-new-1', 'sec-new-2'] as SectionId[];
  const itemIds = [...Object.keys(d.items), 'item-new-1', 'item-new-2'] as ItemId[];
  const variantIds = [...d.variantOrder, 'variant-new' as VariantId];
  const sec = fc.constantFrom(...sectionIds);
  const item = fc.constantFrom(...itemIds);
  const variant = fc.constantFrom(...variantIds);
  const idx = fc.integer({ min: -2, max: 8 });
  return fc.oneof(
    fc.record({ type: fc.constant('item/set' as const), itemId: item, field: fc.constantFrom('role', 'company'), value: fc.string({ maxLength: 4 }) }),
    fc.record({ type: fc.constant('item/create' as const), sectionId: sec, itemId: item, atIndex: idx }),
    fc.record({ type: fc.constant('item/delete' as const), itemId: item }),
    fc.record({ type: fc.constant('item/move' as const), itemId: item, toSection: sec, toIndex: idx }),
    fc.record({ type: fc.constant('section/create' as const), sectionId: sec, kind: fc.constantFrom(...KINDS), atIndex: idx }),
    fc.record({ type: fc.constant('section/delete' as const), sectionId: sec }),
    fc.record({ type: fc.constant('section/move' as const), sectionId: sec, toIndex: idx }),
    fc.record({ type: fc.constant('section/rename' as const), sectionId: sec, title: fc.option(fc.string({ maxLength: 3 }), { nil: undefined }) }),
    fc.record({ type: fc.constant('visibility/set' as const), variantId: variant, node: fc.oneof(sec, item), hidden: fc.boolean() }),
    fc.record({ type: fc.constant('variant/select' as const), variantId: variant }),
    fc.record({ type: fc.constant('variant/delete' as const), variantId: variant }),
    fc.record({ type: fc.constant('variant/customize' as const), variantId: variant, patch: fc.record({ page: fc.constantFrom('A4' as const, 'Letter' as const) }) }),
    variant.map((variantId): Command => ({ type: 'variant/create', variantId, target: testBrand('X'), base: { kind: 'auto' } })),
  );
}

describe('applyCommand properties', () => {
  const sequences = fc.array(commandArb(doc), { maxLength: 40 });

  it('preserves every document invariant', () => {
    fc.assert(
      fc.property(sequences, (cmds) => {
        expect(checkInvariants(cmds.reduce(applyCommand, doc))).toEqual([]);
      }),
      { numRuns: 500 },
    );
  });

  it('is idempotent: applying the same command twice equals applying it once', () => {
    fc.assert(
      fc.property(sequences, commandArb(doc), (cmds, cmd) => {
        const before = cmds.reduce(applyCommand, doc);
        const once = applyCommand(before, cmd);
        expect(applyCommand(once, cmd)).toBe(once);
      }),
      { numRuns: 500 },
    );
  });

  it('bumps rev by exactly one when (and only when) the document changes', () => {
    fc.assert(
      fc.property(sequences, commandArb(doc), (cmds, cmd) => {
        const before = cmds.reduce(applyCommand, doc);
        const after = applyCommand(before, cmd);
        expect(after.rev).toBe(after === before ? before.rev : before.rev + 1);
      }),
      { numRuns: 500 },
    );
  });
});
