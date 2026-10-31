import type { LogoPalette, Oklch, Swatch } from './brand';
import { brandColors, MAX_BRAND_COLORS } from './brandColors';

const sw = (color: Oklch, weight: number): Swatch => ({ color, weight, isGround: false });
const logo = (swatches: readonly Swatch[]) => ({ swatches, source: 'logo' }) as LogoPalette;
const hue = (h: number, weight: number, l = 0.65, c = 0.18) => sw({ l, c, h }, weight);

describe('brandColors', () => {
  it('keeps every distinct chromatic color, heaviest first', () => {
    const colors = brandColors(logo([hue(30, 0.2), hue(130, 0.35), hue(240, 0.3), hue(80, 0.15)]));
    expect(colors.map((c) => c.h)).toEqual([130, 240, 30, 80]);
  });

  it('drops neutrals, near-white and near-black, whatever their weight', () => {
    const colors = brandColors(
      logo([sw({ l: 1, c: 0, h: 0 }, 0.5), sw({ l: 0.5, c: 0.01, h: 0 }, 0.2), sw({ l: 0.08, c: 0.05, h: 260 }, 0.1), hue(30, 0.2)]),
    );
    expect(colors.map((c) => c.h)).toEqual([30]);
  });

  it('merges shades of one hue into the heavier one and drops slivers', () => {
    const colors = brandColors(logo([hue(30, 0.5), hue(33, 0.3, 0.68), hue(130, 0.19), hue(60, 0.01)]));
    expect(colors.map((c) => c.h)).toEqual([30, 130]);
  });

  it(`caps at ${String(MAX_BRAND_COLORS)} colors`, () => {
    const many = Array.from({ length: 9 }, (_, i) => hue(i * 40, 1 / 9));
    expect(brandColors(logo(many))).toHaveLength(MAX_BRAND_COLORS);
  });

  it('is empty for a monochrome or empty logo (callers fall back to the accent)', () => {
    expect(brandColors(logo([sw({ l: 0.15, c: 0.01, h: 0 }, 1)]))).toEqual([]);
    expect(brandColors(logo([]))).toEqual([]);
  });
});
