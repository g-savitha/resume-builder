import fc from 'fast-check';
import type { LogoPalette, RoleChoice, Swatch, SwatchPick } from '@/domain';
import { FIXTURE_PALETTES, testBrand } from '@/testing';
import { derivePalette } from './derivePalette';
import { hexToOklch } from './oklch';
import { SURFACE_FOREGROUNDS, type AccessiblePalette, type ForegroundRole, type SurfaceName } from './types';
import { contrastRatio, MIN_RATIO } from './wcag';

const SURFACES: readonly SurfaceName[] = ['page', 'raised', 'sunken', 'accent'];
const ROLES = Object.keys(SURFACE_FOREGROUNDS) as ForegroundRole[];
const DEFAULT_ROLES: RoleChoice = { ground: 'ground', accent: 'most-chromatic', boost: 0 };
const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** Every surface × foreground pair, recomputed from the emitted CSS colors (not from the report). */
function pairs(p: AccessiblePalette) {
  return SURFACES.flatMap((surface) =>
    ROLES.map((fg) => ({
      surface,
      fg,
      ratio: contrastRatio(p.surfaces[surface][fg], p.surfaces[surface].bg),
      min: MIN_RATIO[SURFACE_FOREGROUNDS[fg]],
    })),
  );
}

function expectAccessible(p: AccessiblePalette) {
  for (const { surface, fg, ratio, min } of pairs(p)) expect(ratio, `${surface}.${fg}`).toBeGreaterThanOrEqual(min);
  expect(contrastRatio(p.surfaces.accent.bg, p.surfaces.page.bg), 'accent fill vs page').toBeGreaterThanOrEqual(3);
}

const oklch = fc.record({
  l: fc.oneof(fc.double({ min: 0, max: 1, noNaN: true }), fc.constantFrom(0, 0.5, 0.56, 1)),
  c: fc.oneof(fc.double({ min: 0, max: 0.37, noNaN: true }), fc.constant(0)),
  h: fc.double({ min: 0, max: 359.99, noNaN: true }),
});
const swatch = fc.record({ color: oklch, weight: fc.double({ min: 0, max: 1, noNaN: true }), isGround: fc.boolean() });
const palette = fc
  .record({
    swatches: fc.array(swatch, { maxLength: 6 }).map((s): readonly Swatch[] => s),
    source: fc.constantFrom('logo', 'site-hint', 'fallback'),
  })
  .map((p) => p as LogoPalette);
const swatchPick: fc.Arbitrary<SwatchPick> = fc.oneof(
  fc.nat({ max: 7 }),
  fc.constantFrom('most-chromatic', 'most-weighted', 'darkest', 'lightest', 'ground'),
);
const roles: fc.Arbitrary<RoleChoice> = fc.record(
  { ground: swatchPick, accent: swatchPick, secondary: swatchPick, boost: fc.constantFrom(0, 1) },
  { requiredKeys: ['ground', 'accent', 'boost'] },
);

describe('derivePalette', () => {
  it('meets WCAG AA for every foreground on every surface (10k random palettes)', () => {
    fc.assert(
      fc.property(palette, roles, (p, r) => {
        expectAccessible(derivePalette(p, r));
      }),
      { numRuns: 10_000 },
    );
  });

  it('reports the true ratio of every pair', () => {
    fc.assert(
      fc.property(palette, roles, (p, r) => {
        const derived = derivePalette(p, r);
        const recomputed = pairs(derived).map(({ surface, fg, ratio }) => ({ surface, fg, ratio }));
        expect([...derived.report].sort(byKey)).toEqual(recomputed.sort(byKey));
      }),
      { numRuns: 500 },
    );
  });

  it('is deterministic', () => {
    fc.assert(
      fc.property(palette, roles, (p, r) => {
        expect(derivePalette(p, r)).toEqual(derivePalette(p, r));
      }),
      { numRuns: 500 },
    );
  });

  it('targets 7:1 text when boost is on, wherever the background allows it', () => {
    fc.assert(
      fc.property(palette, roles, (p, r) => {
        const boosted = derivePalette(p, { ...r, boost: 1 });
        for (const name of ['page', 'raised', 'sunken'] as const) {
          const s = boosted.surfaces[name];
          expect(contrastRatio(s.text, s.bg)).toBeGreaterThanOrEqual(7);
          expect(contrastRatio(s.heading, s.bg)).toBeGreaterThanOrEqual(7);
        }
      }),
      { numRuns: 1_000 },
    );
  });

  describe.each(Object.entries(FIXTURE_PALETTES))('fixture %s', (_name, p) => {
    it.each([0, 1] as const)('is accessible with boost %i', (boost) => {
      expectAccessible(derivePalette(p, { ...DEFAULT_ROLES, boost }));
    });
  });

  it('is accessible for the name-hash fallback palette', () => {
    for (const name of ['Experian', 'Microsoft', '', 'Ω']) expectAccessible(derivePalette(testBrand(name).palette, DEFAULT_ROLES));
  });

  it('follows the logo ground: light page on white, dark page on black', () => {
    const light = derivePalette(FIXTURE_PALETTES['microsoft-like'], DEFAULT_ROLES);
    const dark = derivePalette(FIXTURE_PALETTES['streaming-red-on-black'], DEFAULT_ROLES);
    expect(light.mode).toBe('light');
    expect(hexToOklch(light.surfaces.page.bg).l).toBeGreaterThan(0.95);
    expect(dark.mode).toBe('dark');
    expect(hexToOklch(dark.surfaces.page.bg).l).toBeLessThan(0.22);
  });

  it('uses a brand color raw when it already passes', () => {
    // Experian-like raspberry #ba2f7d is the most chromatic swatch and reads on a near-white page.
    const p = derivePalette(FIXTURE_PALETTES['experian-like'], DEFAULT_ROLES);
    expect(p.surfaces.page.accentText).toBe('#ba2f7d');
    const navy = derivePalette(FIXTURE_PALETTES['experian-like'], { ...DEFAULT_ROLES, accent: 1 });
    expect(navy.surfaces.page.accentText).toBe('#26478d');
  });

  it('fills the accent surface with the logo color when it already stands out from the page', () => {
    expect(derivePalette(FIXTURE_PALETTES['experian-like'], DEFAULT_ROLES).surfaces.accent.bg).toBe('#ba2f7d');
    expect(derivePalette(FIXTURE_PALETTES['microsoft-like'], DEFAULT_ROLES).surfaces.accent.bg).toBe('#f25022');
    // Pure yellow is 1.07:1 on white, so the fill darkens until it shows (3:1) and keeps its hue.
    const yellow = hexToOklch(derivePalette(FIXTURE_PALETTES['pure-yellow'], DEFAULT_ROLES).surfaces.accent.bg);
    expect(hueDistance(yellow.h, 109.77)).toBeLessThan(3);
  });

  it('keeps the brand hue when it has to adjust a color', () => {
    const cases = [
      { fixture: 'microsoft-like', hue: 35.64 }, // #f25022 is 3.6:1 on white: darkened
      { fixture: 'pure-yellow', hue: 109.77 }, // #ffff00 is 1.07:1 on white: darkened a lot
      { fixture: 'yellow-on-mid-grey', hue: 81.04 },
    ] as const;
    for (const { fixture, hue } of cases) {
      const accentText = derivePalette(FIXTURE_PALETTES[fixture], DEFAULT_ROLES).surfaces.page.accentText;
      const out = hexToOklch(accentText);
      expect(out.c, fixture).toBeGreaterThan(0.05);
      expect(hueDistance(out.h, hue), fixture).toBeLessThan(3);
    }
  });

  it('keeps gray-only brands gray', () => {
    const p = derivePalette(FIXTURE_PALETTES['mid-greys'], DEFAULT_ROLES);
    for (const name of SURFACES) for (const fg of ROLES) expect(hexToOklch(p.surfaces[name][fg]).c, `${name}.${fg}`).toBeLessThan(0.01);
  });

  it('mints types that cannot be forged or mixed up', () => {
    const p = derivePalette(FIXTURE_PALETTES['microsoft-like'], DEFAULT_ROLES);
    // @ts-expect-error a palette cannot be built by hand
    const forged: AccessiblePalette = { mode: 'light', surfaces: p.surfaces, report: [] };
    // @ts-expect-error an icon color (3:1) cannot stand in for text (4.5:1)
    const text: (typeof p.surfaces.page)['text'] = p.surfaces.page.icon;
    expect([forged, text]).toHaveLength(2);
  });
});

function byKey(a: { surface: string; fg: string }, b: { surface: string; fg: string }) {
  return `${a.surface}.${a.fg}`.localeCompare(`${b.surface}.${b.fg}`);
}
