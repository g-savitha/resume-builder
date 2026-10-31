import { DEFAULT_ROLES, SURFACE_NAMES } from '@/domain';
import { FIXTURE_PALETTES } from '@/testing';
import { brandDecor } from './brandDecor';
import { derivePalette } from './derivePalette';
import { contrastRatio } from './wcag';

describe('brandDecor', () => {
  it('a four-color logo: four raw strip colors, and every mark ≥ 3:1 on every surface', () => {
    for (const roles of [DEFAULT_ROLES, { ...DEFAULT_ROLES, boost: 1 as const }]) {
      const logo = FIXTURE_PALETTES['microsoft-like'];
      const palette = derivePalette(logo, roles);
      const d = brandDecor(logo, roles, palette);
      expect(new Set(d.strip)).toEqual(new Set(['#f25022', '#7fba00', '#00a4ef', '#ffb900']));
      expect(d.strip).toHaveLength(4);
      for (const surface of SURFACE_NAMES) {
        expect(d.marks[surface]).toHaveLength(4);
        for (const m of d.marks[surface]) expect(contrastRatio(m, palette.surfaces[surface].bg), `${surface} ${m}`).toBeGreaterThanOrEqual(3);
      }
      // The decoration never touches the page: it stays pure white.
      expect(palette.surfaces.page.bg).toBe('#ffffff');
    }
  });

  it('every fixture palette: marks pass 3:1 on every surface; a logo with no brand color degrades to one color', () => {
    for (const [name, logo] of Object.entries(FIXTURE_PALETTES)) {
      const palette = derivePalette(logo, DEFAULT_ROLES);
      const d = brandDecor(logo, DEFAULT_ROLES, palette);
      expect(d.strip.length, name).toBeGreaterThanOrEqual(1);
      for (const surface of SURFACE_NAMES) {
        for (const m of d.marks[surface]) expect(contrastRatio(m, palette.surfaces[surface].bg), `${name} ${surface}`).toBeGreaterThanOrEqual(3);
      }
    }
    expect(brandDecor(FIXTURE_PALETTES['mid-greys'], DEFAULT_ROLES, derivePalette(FIXTURE_PALETTES['mid-greys'], DEFAULT_ROLES)).strip).toHaveLength(1);
  });
});
