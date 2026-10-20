import fc from 'fast-check';
import { gamutMap, hexToOklch, toHex } from './oklch';

const hexArb = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);

describe('OKLCH conversion', () => {
  it('matches the CSS Color 4 reference values', () => {
    // oklch(62.8% 0.2577 29.23) is sRGB red; white and black are the lightness poles.
    const red = hexToOklch('#ff0000');
    expect(red.l).toBeCloseTo(0.628, 3);
    expect(red.c).toBeCloseTo(0.2577, 3);
    expect(red.h).toBeCloseTo(29.23, 1);
    expect(toHex({ l: 0.628, c: 0.2577, h: 29.23 })).toBe('#ff0000');
    expect(toHex({ l: 1, c: 0, h: 0 })).toBe('#ffffff');
    expect(toHex({ l: 0, c: 0, h: 0 })).toBe('#000000');
  });

  it('round-trips every 8-bit color', () => {
    fc.assert(fc.property(hexArb, (hex) => toHex(hexToOklch(hex)) === hex), { numRuns: 10_000 });
  });

  it('maps out-of-gamut colors into sRGB by lowering chroma only', () => {
    const arb = fc.record({
      l: fc.double({ min: 0.05, max: 0.95, noNaN: true }),
      c: fc.double({ min: 0, max: 0.5, noNaN: true }),
      h: fc.double({ min: 0, max: 359.9, noNaN: true }),
    });
    fc.assert(
      fc.property(arb, (color) => {
        const mapped = gamutMap(color);
        expect(mapped.l).toBe(color.l);
        expect(mapped.h).toBe(color.h);
        expect(mapped.c).toBeLessThanOrEqual(color.c);
        expect(toHex(mapped)).toMatch(/^#[0-9a-f]{6}$/);
      }),
      { numRuns: 2_000 },
    );
  });
});
