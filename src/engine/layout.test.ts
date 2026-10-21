import fc from 'fast-check';
import { layoutDocument } from './layout';
import { pageSize } from './pageSize';
import { px, type FlowBlock, type Measured, type Measurer, type PagedLayout, type PageSize } from './types';

/** A block that carries its own measurements; the fake measurer just returns them. */
interface TestBlock extends FlowBlock {
  readonly m: Measured;
}
const measurer: Measurer<TestBlock> = { measure: (b) => b.m };

/** Content box 100 × 100 px (page 120 × 120, margin 10). */
const PAGE: PageSize = { name: 'A4', w: px(120), h: px(120), marginPx: px(10) };

interface BlockSpec {
  readonly atoms: readonly number[];
  readonly kwn?: readonly number[]; // atom indices that keep with next
  readonly top?: number;
  readonly bottom?: number;
  readonly gap?: number;
  readonly together?: boolean;
}
function block(key: string, s: BlockSpec): TestBlock {
  return {
    key,
    contentHash: JSON.stringify(s),
    m: {
      atoms: s.atoms.map((h, i) => ({ h: px(h), keepWithNext: s.kwn?.includes(i) ?? false })),
      chromeTop: px(s.top ?? 0),
      chromeBottom: px(s.bottom ?? 0),
      gapAfter: px(s.gap ?? 0),
      keepTogether: s.together ?? false,
    },
  };
}

/** Each page as `key[from,to)@y`, the shape a reviewer can check by hand. */
function summary(layout: PagedLayout): string[][] {
  return layout.pages.map((p) =>
    p.regions.flatMap((r) => r.fragments.map((f) => `${f.key}[${String(f.range.from)},${String(f.range.to)})@${String(f.y)}`)),
  );
}
const lay = (blocks: readonly TestBlock[], rules?: { orphans?: number; widows?: number }) =>
  layoutDocument({ blocks, size: PAGE, styleHash: 's', ...(rules ? { rules } : {}) }, measurer);

describe('layoutDocument', () => {
  it('stacks blocks with their chrome and gaps on one page when they fit', () => {
    const layout = lay([block('a', { top: 10, atoms: [20, 20], bottom: 5, gap: 5 }), block('b', { atoms: [30] })]);
    expect(summary(layout)).toEqual([['a[0,2)@0', 'b[0,1)@60']]);
    const [a, b] = layout.pages[0]?.regions[0]?.fragments ?? [];
    expect(a?.h).toBe(55);
    expect(b?.h).toBe(30);
    expect(layout.pages[0]?.overflow).toBe(false);
  });

  it('splits a block between atoms; the continuation has no top chrome and is marked continued', () => {
    const layout = lay([block('a', { top: 10, atoms: [40, 40, 40], bottom: 5 })]);
    expect(summary(layout)).toEqual([['a[0,2)@0'], ['a[2,3)@0']]);
    const first = layout.pages[0]?.regions[0]?.fragments[0];
    const second = layout.pages[1]?.regions[0]?.fragments[0];
    expect(first?.h).toBe(90); // top chrome + 2 atoms, no bottom chrome
    expect(first?.range.continued).toBe(false);
    expect(second?.range.continued).toBe(true);
    expect(second?.h).toBe(45); // 40 + bottom chrome, no top chrome
  });

  it('never leaves a heading alone at the bottom of a page', () => {
    const layout = lay([block('a', { atoms: [90] }), block('b', { top: 8, atoms: [20] })]);
    expect(summary(layout)).toEqual([['a[0,1)@0'], ['b[0,1)@0']]);
  });

  it('does not carry the gap onto the next page', () => {
    const layout = lay([block('a', { atoms: [95], gap: 10 }), block('b', { atoms: [10] })]);
    expect(summary(layout)).toEqual([['a[0,1)@0'], ['b[0,1)@0']]);
  });

  it('keeps an atom marked keep-with-next on the same page as the atom after it', () => {
    // Room for a's title line (10) but not its first bullet: both move.
    const layout = lay([block('x', { atoms: [80] }), block('a', { atoms: [10, 20, 20], kwn: [0] })]);
    expect(summary(layout)).toEqual([['x[0,1)@0'], ['a[0,3)@0']]);
  });

  it('moves a keep-together block to the next page instead of splitting it', () => {
    const layout = lay([block('x', { atoms: [50] }), block('a', { atoms: [30, 30], together: true })]);
    expect(summary(layout)).toEqual([['x[0,1)@0'], ['a[0,2)@0']]);
  });

  it('splits a keep-together block that is taller than a page', () => {
    const layout = lay([block('a', { atoms: [60, 60, 60], together: true })]);
    expect(summary(layout)).toEqual([['a[0,1)@0'], ['a[1,2)@0'], ['a[2,3)@0']]);
  });

  it('honours orphans and widows', () => {
    // 4 atoms of 30; 3 fit. With widows 2 the break moves up so 2 atoms reach the next page.
    const atoms = [30, 30, 30, 30];
    expect(summary(lay([block('a', { atoms })]))).toEqual([['a[0,3)@0'], ['a[3,4)@0']]);
    expect(summary(lay([block('a', { atoms })], { widows: 2 }))).toEqual([['a[0,2)@0'], ['a[2,4)@0']]);
    // Orphans 2 with room for one atom after x: the block moves rather than leave one atom behind.
    const layout = lay([block('x', { atoms: [60] }), block('a', { atoms })], { orphans: 2 });
    expect(summary(layout)).toEqual([['x[0,1)@0'], ['a[0,3)@0'], ['a[3,4)@0']]);
  });

  it('places an atom taller than a page alone and flags that page as overflowing', () => {
    const layout = lay([block('a', { atoms: [10, 150, 10] })]);
    expect(summary(layout)).toEqual([['a[0,1)@0'], ['a[1,2)@0'], ['a[2,3)@0']]);
    expect(layout.pages.map((p) => p.overflow)).toEqual([false, true, false]);
  });

  it('breaks a keep-with-next chain taller than a page rather than overflow it', () => {
    const layout = lay([block('a', { atoms: [60, 60], kwn: [0] })]);
    expect(summary(layout)).toEqual([['a[0,1)@0'], ['a[1,2)@0']]);
    expect(layout.pages.some((p) => p.overflow)).toBe(false);
  });

  it('lays out an empty resume as one empty page', () => {
    expect(summary(lay([]))).toEqual([[]]);
  });

  it('rejects duplicate block keys', () => {
    expect(() => lay([block('a', { atoms: [1] }), block('a', { atoms: [1] })])).toThrow(/Duplicate flow block key: a/);
  });

  it('uses the content box (page minus margins) for width and height', () => {
    const size = pageSize('Letter', 25.4);
    const layout = layoutDocument({ blocks: [], size, styleHash: 's' }, measurer);
    const region = layout.pages[0]?.regions[0];
    expect(region?.width).toBeCloseTo(816 - 192);
    expect(region?.height).toBeCloseTo(1056 - 192);
  });
});

describe('pageSize', () => {
  it('converts A4 and US Letter to CSS pixels at 96 dpi', () => {
    const a4 = pageSize('A4', 10);
    expect([a4.w, a4.h, a4.marginPx].map((v) => Math.round(v * 10) / 10)).toEqual([793.7, 1122.5, 37.8]);
    const letter = pageSize('Letter', 0);
    expect(letter.w).toBeCloseTo(816);
    expect(letter.h).toBeCloseTo(1056);
  });
});

describe('layoutDocument properties (random blocks, fake measurer)', () => {
  const specArb = fc.record({
    atoms: fc.array(fc.integer({ min: 1, max: 140 }), { maxLength: 6 }),
    kwn: fc.array(fc.integer({ min: 0, max: 5 }), { maxLength: 3 }),
    top: fc.integer({ min: 0, max: 20 }),
    bottom: fc.integer({ min: 0, max: 10 }),
    gap: fc.integer({ min: 0, max: 15 }),
    together: fc.boolean(),
  });
  const inputArb = fc.record({
    specs: fc.array(specArb, { maxLength: 12 }),
    orphans: fc.integer({ min: 1, max: 3 }),
    widows: fc.integer({ min: 1, max: 3 }),
  });
  const build = (specs: readonly BlockSpec[]) => specs.map((s, i) => block(`b${String(i)}`, s));

  it('places every atom exactly once, in reading order', () => {
    fc.assert(
      fc.property(inputArb, ({ specs, orphans, widows }) => {
        const blocks = build(specs);
        const layout = lay(blocks, { orphans, widows });
        const placed = layout.pages.flatMap((p) => p.regions.flatMap((r) => r.fragments));
        const expected = blocks.flatMap((b) => b.m.atoms.map((_, i) => `${b.key}:${String(i)}`));
        const actual = placed.flatMap((f) =>
          Array.from({ length: f.range.to - f.range.from }, (_, i) => `${f.key}:${String(f.range.from + i)}`),
        );
        expect(actual).toEqual(expected);
        // Each block appears, in order, even without atoms.
        expect([...new Set(placed.map((f) => f.key))]).toEqual(blocks.map((b) => b.key));
      }),
    );
  });

  it('keeps fragments inside the page and apart, except a lone atom taller than the page', () => {
    fc.assert(
      fc.property(inputArb, ({ specs, orphans, widows }) => {
        const layout = lay(build(specs), { orphans, widows });
        for (const page of layout.pages) {
          for (const region of page.regions) {
            const fs = region.fragments;
            if (page.overflow) {
              expect(fs).toHaveLength(1);
              expect(fs[0]?.range.to).toBe((fs[0]?.range.from ?? 0) + 1);
              continue;
            }
            fs.forEach((f, i) => {
              expect(f.y + f.h).toBeLessThanOrEqual(region.height);
              const next = fs[i + 1];
              if (next) expect(next.y).toBeGreaterThanOrEqual(f.y + f.h);
            });
          }
        }
      }),
    );
  });

  it('breaks a keep rule only at the top of a page, where moving on could not help', () => {
    fc.assert(
      fc.property(inputArb, ({ specs, orphans, widows }) => {
        const blocks = build(specs);
        const layout = lay(blocks, { orphans, widows });
        const byKey = new Map(blocks.map((b) => [b.key, b.m]));
        for (const page of layout.pages) {
          for (const f of page.regions.flatMap((r) => r.fragments)) {
            const m = byKey.get(f.key);
            if (!m || f.range.to === m.atoms.length) continue; // not a split
            const brokeKeep =
              m.keepTogether ||
              (m.atoms[f.range.to - 1]?.keepWithNext ?? false) ||
              f.range.to - f.range.from < orphans ||
              m.atoms.length - f.range.to < widows;
            if (brokeKeep) expect(f.y).toBe(0);
          }
        }
      }),
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(inputArb, ({ specs, orphans, widows }) => {
        expect(lay(build(specs), { orphans, widows })).toEqual(lay(build(specs), { orphans, widows }));
      }),
    );
  });
});
