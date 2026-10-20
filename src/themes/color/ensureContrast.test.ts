import fc from 'fast-check';
import type { Oklch } from '@/domain';
import { ensureContrast, maxRatio } from './ensureContrast';
import { hexToOklch, toHex } from './oklch';
import type { ContrastLevel, ContrastSafe } from './types';
import { contrastRatio, MIN_RATIO } from './wcag';

const oklch = fc.record({
  l: fc.oneof(fc.double({ min: 0, max: 1, noNaN: true }), fc.constantFrom(0, 0.5, 1)),
  c: fc.double({ min: 0, max: 0.37, noNaN: true }),
  h: fc.double({ min: 0, max: 359.99, noNaN: true }),
});
/** Brand colors as a logo yields them: in-gamut sRGB with a visible hue. */
const brandColor = fc
  .integer({ min: 0, max: 0xffffff })
  .map((n) => hexToOklch(`#${n.toString(16).padStart(6, '0')}`))
  .filter((c) => c.c > 0.08);
const level = fc.constantFrom<ContrastLevel>('AA-text', 'AA-ui');
const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

describe('ensureContrast', () => {
  it('always meets the level against the background (10k cases)', () => {
    fc.assert(
      fc.property(oklch, oklch, level, (fg, bg, lvl) => {
        expect(contrastRatio(ensureContrast(fg, bg, lvl), toHex(bg))).toBeGreaterThanOrEqual(MIN_RATIO[lvl]);
      }),
      { numRuns: 10_000 },
    );
  });

  it('returns a color that already passes unchanged', () => {
    fc.assert(
      fc.property(oklch, oklch, level, (fg, bg, lvl) => {
        fc.pre(contrastRatio(toHex(fg), toHex(bg)) >= MIN_RATIO[lvl]);
        expect(ensureContrast(fg, bg, lvl)).toBe(toHex(fg));
      }),
      { numRuns: 2_000 },
    );
  });

  it('keeps the brand hue when the adjusted color still has visible chroma', () => {
    // Drawn from real sRGB brand colors: random out-of-gamut OKLCH mostly ends near-gray after gamut mapping,
    // which made fast-check discard ~94% of cases and the test slow.
    fc.assert(
      fc.property(brandColor, oklch, level, (fg, bg, lvl) => {
        const out = hexToOklch(ensureContrast(fg, bg, lvl));
        fc.pre(out.c > 0.05);
        expect(hueDistance(out.h, fg.h)).toBeLessThan(3);
      }),
      { numRuns: 5_000 },
    );
  });

  it('adjusts lightness only as much as needed', () => {
    fc.assert(
      fc.property(oklch, oklch, level, (fg, bg, lvl) => {
        const bgHex = toHex(bg);
        const out = ensureContrast(fg, bg, lvl);
        fc.pre(out !== toHex(fg));
        // Going 0.01 in OKLCH lightness back toward the original color no longer passes.
        const outL = hexToOklch(out).l;
        const back: Oklch = { ...fg, l: outL + Math.sign(fg.l - outL) * 0.01 };
        expect(contrastRatio(toHex(back), bgHex)).toBeLessThan(MIN_RATIO[lvl]);
      }),
      { numRuns: 5_000 },
    );
  });

  it('reaches a higher aim (7:1) where the background allows it, and AA everywhere', () => {
    fc.assert(
      fc.property(oklch, oklch, (fg, bg) => {
        const bgHex = toHex(bg);
        const ratio = contrastRatio(ensureContrast(fg, bg, 'AA-text', 7), bgHex);
        expect(ratio).toBeGreaterThanOrEqual(Math.max(4.5, Math.min(7, maxRatio(bgHex))) - 1e-9);
      }),
      { numRuns: 2_000 },
    );
  });

  it('darkens pure yellow on white to a readable yellow-brown', () => {
    const yellow = hexToOklch('#ffff00');
    const out = ensureContrast(yellow, { l: 1, c: 0, h: 0 }, 'AA-text');
    expect(contrastRatio(out, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(out, '#ffffff')).toBeLessThan(4.6);
    expect(hueDistance(hexToOklch(out).h, yellow.h)).toBeLessThan(3);
  });

  it('mints a type that a plain string or a weaker level cannot fake', () => {
    const ui = ensureContrast({ l: 0.5, c: 0.1, h: 200 }, { l: 1, c: 0, h: 0 }, 'AA-ui');
    // @ts-expect-error a plain string is not contrast-checked
    const forged: ContrastSafe<'AA-text'> = '#777777';
    // @ts-expect-error a 3:1 UI color is not text-safe
    const asText: ContrastSafe<'AA-text'> = ui;
    expect([forged, asText]).toHaveLength(2);
  });
});
