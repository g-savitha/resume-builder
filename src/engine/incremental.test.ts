import fc from 'fast-check';
import { layoutDocument } from './layout';
import { px, type FlowBlock, type Measured, type Measurer, type PagedLayout, type PageSize } from './types';

interface TestBlock extends FlowBlock {
  readonly m: Measured;
}
/** Records which blocks were measured, so a test can see how much work a relayout did. */
function recordingMeasurer() {
  const measured: string[] = [];
  const measurer: Measurer<TestBlock> = {
    measure: (b) => {
      measured.push(b.key);
      return b.m;
    },
  };
  return { measurer, measured };
}

/** Content box 100 × 100 px. */
const PAGE: PageSize = { name: 'A4', w: px(120), h: px(120), marginPx: px(10) };

interface Spec {
  readonly atoms: readonly number[];
  readonly kwn: readonly number[];
  readonly top: number;
  readonly gap: number;
  readonly together: boolean;
}
function block(key: string, s: Spec, rev = 0): TestBlock {
  return {
    key,
    contentHash: `${JSON.stringify(s)}#${String(rev)}`,
    m: {
      atoms: s.atoms.map((h, i) => ({ h: px(h), keepWithNext: s.kwn.includes(i) })),
      chromeTop: px(s.top),
      chromeTopContinued: px(0),
      chromeBottom: px(0),
      gapAfter: px(s.gap),
      keepTogether: s.together,
    },
  };
}
const plain = (atoms: readonly number[]): Spec => ({ atoms, kwn: [], top: 0, gap: 0, together: false });

const lay = (blocks: readonly TestBlock[], prev?: PagedLayout<TestBlock>, styleHash = 's') => {
  const rec = recordingMeasurer();
  const layout = layoutDocument({ blocks, size: PAGE, styleHash }, rec.measurer, prev);
  return { layout, measured: rec.measured };
};

describe('incremental relayout', () => {
  // Ten blocks of 60 px on 100 px pages: one block per page.
  const ten = Array.from({ length: 10 }, (_, i) => block(`b${String(i)}`, plain([60])));

  it('re-lays only the pages around an edit that keeps the height, and reuses the rest by identity', () => {
    const before = lay(ten).layout;
    const edited = ten.map((b, i) => (i === 3 ? block(b.key, plain([60]), 1) : b));
    const { layout, measured } = lay(edited, before);

    expect(layout).toEqual(lay(edited).layout);
    // Restart at the page holding the end of b2 (b3 could have moved up), stop once b4 starts a page as before.
    // b4 is measured to learn that it does not fit after b3; the rest is not.
    expect(measured).toEqual(['b2', 'b3', 'b4']);
    const same = layout.pages.map((p, i) => p === before.pages[i]);
    expect(same).toEqual([true, true, false, false, true, true, true, true, true, true]);
  });

  it('moves an edited block up when it shrinks enough to fit after the previous block', () => {
    const before = lay(ten).layout;
    const edited = ten.map((b, i) => (i === 3 ? block(b.key, plain([30])) : b));
    const { layout } = lay(edited, before);
    expect(layout).toEqual(lay(edited).layout);
    expect(layout.pages).toHaveLength(9);
    expect(layout.pages[2]?.regions[0]?.fragments.map((f) => f.key)).toEqual(['b2', 'b3']);
    // b4 starts page 3 as it started page 4 before: the old tail is reused, renumbered by position.
    expect(layout.pages.slice(3)).toEqual(before.pages.slice(4));
    layout.pages.slice(3).forEach((p, i) => {
      expect(p).toBe(before.pages[i + 4]);
    });
  });

  it('returns the previous pages when nothing changed', () => {
    const before = lay(ten).layout;
    const { layout, measured } = lay([...ten], before);
    expect(layout.pages).toBe(before.pages);
    expect(measured).toEqual([]);
  });

  it('lays out from scratch when the style hash changes', () => {
    const before = lay(ten).layout;
    const { layout, measured } = lay(ten, before, 'bigger-font');
    expect(measured).toHaveLength(10);
    expect(layout.pages.some((p, i) => p === before.pages[i])).toBe(false);
    expect(layout.styleHash).toBe('bigger-font');
  });
});

describe('incremental relayout properties', () => {
  const specArb: fc.Arbitrary<Spec> = fc.record({
    atoms: fc.array(fc.integer({ min: 1, max: 130 }), { maxLength: 5 }),
    kwn: fc.array(fc.integer({ min: 0, max: 4 }), { maxLength: 2 }),
    top: fc.integer({ min: 0, max: 15 }),
    gap: fc.integer({ min: 0, max: 12 }),
    together: fc.boolean(),
  });
  type Edit =
    | { readonly t: 'replace'; readonly at: number; readonly spec: Spec }
    | { readonly t: 'rehash'; readonly at: number }
    | { readonly t: 'insert'; readonly at: number; readonly spec: Spec }
    | { readonly t: 'delete'; readonly at: number }
    | { readonly t: 'move'; readonly at: number; readonly to: number }
    | { readonly t: 'restyle' };
  const at = fc.nat({ max: 20 });
  const editArb: fc.Arbitrary<Edit> = fc.oneof(
    fc.record({ t: fc.constant('replace' as const), at, spec: specArb }),
    fc.record({ t: fc.constant('rehash' as const), at }),
    fc.record({ t: fc.constant('insert' as const), at, spec: specArb }),
    fc.record({ t: fc.constant('delete' as const), at }),
    fc.record({ t: fc.constant('move' as const), at, to: at }),
    fc.record({ t: fc.constant('restyle' as const) }),
  );

  let nextKey = 0;
  function apply(blocks: readonly TestBlock[], e: Edit): TestBlock[] {
    const out = [...blocks];
    const i = out.length ? ('at' in e ? e.at % out.length : 0) : 0;
    const target = out[i];
    switch (e.t) {
      case 'replace':
        if (target) out[i] = block(target.key, e.spec, 1);
        return out;
      case 'rehash':
        if (target) out[i] = { ...target, contentHash: `${target.contentHash}+` };
        return out;
      case 'insert':
        out.splice(i, 0, block(`n${String(nextKey++)}`, e.spec));
        return out;
      case 'delete':
        out.splice(i, 1);
        return out;
      case 'move': {
        const [moved] = out.splice(i, 1);
        if (moved) out.splice(e.to % (out.length + 1), 0, moved);
        return out;
      }
      case 'restyle':
        return out;
      default: {
        const _exhaustive: never = e;
        return _exhaustive;
      }
    }
  }

  it('after any sequence of edits, equals a layout from scratch', () => {
    fc.assert(
      fc.property(fc.array(specArb, { maxLength: 12 }), fc.array(editArb, { minLength: 1, maxLength: 6 }), (specs, edits) => {
        let blocks = specs.map((s, i) => block(`b${String(i)}`, s));
        let style = 0;
        let layout = lay(blocks, undefined, String(style)).layout;
        for (const e of edits) {
          blocks = apply(blocks, e);
          if (e.t === 'restyle') style++;
          layout = lay(blocks, layout, String(style)).layout;
          expect(layout).toEqual(lay(blocks, undefined, String(style)).layout);
        }
      }),
    );
  });

  it('never re-measures a block on a page before the edit', () => {
    fc.assert(
      fc.property(fc.array(specArb, { minLength: 1, maxLength: 12 }), at, specArb, (specs, rawAt, spec) => {
        const blocks = specs.map((s, i) => block(`b${String(i)}`, s));
        const before = lay(blocks).layout;
        const i = rawAt % blocks.length;
        const edited = blocks.map((b, j) => (j === i ? block(b.key, spec, 1) : b));
        const { layout, measured } = lay(edited, before);
        // Pages wholly before the edited block's first page keep their identity, and none of their blocks is measured.
        const firstPageOfEdit = before.pages.findIndex((p) => p.regions[0]?.fragments.some((f) => f.key === `b${String(i)}`));
        const restartBound = Math.max(0, firstPageOfEdit - 1);
        for (let p = 0; p < restartBound; p++) {
          expect(layout.pages[p]).toBe(before.pages[p]);
          for (const f of before.pages[p]?.regions[0]?.fragments ?? []) {
            const onlyThere = !before.pages.slice(restartBound).some((q) => q.regions[0]?.fragments.some((g) => g.key === f.key));
            if (onlyThere) expect(measured).not.toContain(f.key);
          }
        }
      }),
    );
  });
});
