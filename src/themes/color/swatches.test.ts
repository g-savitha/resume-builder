import { describe, expect, it } from 'vitest';
import type { RoleChoice } from '@/domain';
import { FIXTURE_PALETTES } from '@/testing';
import { colorName, rolePreview, swatchOptions } from './swatches';
import { contrastRatio } from './wcag';

const AUTO: RoleChoice = { ground: 'ground', accent: 'most-chromatic', boost: 0 };
const microsoft = FIXTURE_PALETTES['microsoft-like'];

describe('swatchOptions', () => {
  it('offers every colored swatch by its palette index, and never the ground', () => {
    const options = swatchOptions(microsoft);
    expect(options.map((o) => o.index)).toEqual([1, 2, 3, 4]);
    expect(options.map((o) => o.name)).toEqual(['red', 'green', 'blue', 'yellow']);
    expect(options.map((o) => o.hex)).toEqual(['#f25022', '#7fba00', '#00a4ef', '#ffb900']);
    expect(options.reduce((sum, o) => sum + o.share, 0)).toBeCloseTo(1);
  });

  it('is empty when the logo has no colors', () => {
    expect(swatchOptions(FIXTURE_PALETTES.empty)).toEqual([]);
  });
});

describe('colorName', () => {
  it('names neutrals by lightness and colors by hue', () => {
    expect(colorName({ l: 1, c: 0, h: 0 })).toBe('white');
    expect(colorName({ l: 0.5, c: 0, h: 0 })).toBe('grey');
    expect(colorName({ l: 0.4135, c: 0.1227, h: 263.12 })).toBe('dark blue');
    expect(colorName({ l: 0.5814, c: 0.2349, h: 27.99 })).toBe('red');
    expect(colorName({ l: 0.5436, c: 0.1886, h: 350.97 })).toBe('red');
  });
});

describe('rolePreview', () => {
  it('picking the blue swatch makes the banner and headings blue, darkened until they pass on white', () => {
    const { accent } = rolePreview(microsoft, { ...AUTO, accent: 3 });
    expect(accent?.swatch).toBe('#00a4ef');
    expect(accent?.adjusted).toBe(true);
    expect(contrastRatio(accent?.fill ?? '', '#ffffff')).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(accent?.text ?? '', '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('reports no adjustment when the swatch already passes as it is', () => {
    const dark = FIXTURE_PALETTES['experian-like'];
    const { accent } = rolePreview(dark, { ...AUTO, accent: 1 });
    expect(accent).toMatchObject({ swatch: '#26478d', fill: '#26478d', adjusted: false });
  });

  it('describes the secondary only when one is chosen', () => {
    expect(rolePreview(microsoft, AUTO).secondary).toBeUndefined();
    const { secondary } = rolePreview(microsoft, { ...AUTO, secondary: 2 });
    expect(secondary?.swatch).toBe('#7fba00');
    expect(contrastRatio(secondary?.fill ?? '', '#ffffff')).toBeGreaterThanOrEqual(3);
  });

  it('a stale index falls back to the automatic accent', () => {
    expect(rolePreview(microsoft, { ...AUTO, accent: 42 }).accent).toEqual(rolePreview(microsoft, AUTO).accent);
  });
});
