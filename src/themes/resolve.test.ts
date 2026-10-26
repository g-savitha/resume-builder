import { DEFAULT_CUSTOMIZATION, DEFAULT_ROLES, FOREGROUND_ROLES, SURFACE_NAMES, type Variant, type VariantId } from '@/domain';
import { surfaceVar, THEME_VARS } from '@/primitives';
import { FIXTURE_PALETTES, testBrand } from '@/testing';
import { derivePalette } from './color';
import { resolveTheme, themeBaseFor } from './resolve';

const variant = (patch: Partial<Variant> = {}): Variant => ({
  id: 'v1' as VariantId,
  label: 'Microsoft',
  brand: { ...testBrand('Microsoft'), palette: FIXTURE_PALETTES['microsoft-like'] },
  themeBase: { kind: 'archetype', id: 'classic' },
  roles: DEFAULT_ROLES,
  customization: DEFAULT_CUSTOMIZATION,
  hidden: [],
  ...patch,
});

describe('resolveTheme', () => {
  it('sets every surface color from the derived palette, through the primitives variable names', () => {
    const v = variant();
    const theme = resolveTheme(v);
    const palette = derivePalette(v.brand.palette, v.roles);
    for (const surface of SURFACE_NAMES) {
      expect(theme.cssVars[surfaceVar(surface, 'bg')]).toBe(palette.surfaces[surface].bg);
      for (const role of FOREGROUND_ROLES) {
        expect(theme.cssVars[surfaceVar(surface, role)]).toBe(palette.surfaces[surface][role]);
      }
    }
    expect(theme.palette).toEqual(palette);
  });

  it('sets every type and spacing variable the block kit reads', () => {
    const theme = resolveTheme(variant());
    for (const name of THEME_VARS) expect(theme.cssVars[name], name).toEqual(expect.any(String));
  });

  it('scales type with fontScale', () => {
    const at = (fontScale: 0.9 | 1.1) => resolveTheme(variant({ customization: { ...DEFAULT_CUSTOMIZATION, fontScale } }));
    expect(at(0.9).cssVars['--rs-body']).toBe('9.45pt'); // 10.5pt body × 0.9
    expect(at(1.1).cssVars['--rs-body']).toBe('11.55pt');
  });

  it('changes styleHash exactly when geometry can change', () => {
    const base = resolveTheme(variant());
    const recolored = resolveTheme(variant({ brand: { ...testBrand('Experian'), palette: FIXTURE_PALETTES['experian-like'] } }));
    const otherRoles = resolveTheme(variant({ roles: { ...DEFAULT_ROLES, boost: 1 } }));
    expect(recolored.styleHash).toBe(base.styleHash);
    expect(otherRoles.styleHash).toBe(base.styleHash);
    expect(recolored.key).not.toBe(base.key);

    const geometryChanges: Partial<Variant>[] = [
      { customization: { ...DEFAULT_CUSTOMIZATION, fontScale: 1.05 } },
      { customization: { ...DEFAULT_CUSTOMIZATION, lineHeight: 'relaxed' } },
      { customization: { ...DEFAULT_CUSTOMIZATION, sectionGap: 'airy' } },
      { themeBase: { kind: 'archetype', id: 'ats-plain' } },
    ];
    for (const patch of geometryChanges) {
      const changed = resolveTheme(variant(patch));
      expect(changed.styleHash, JSON.stringify(patch)).not.toBe(base.styleHash);
      expect(changed.key).not.toBe(base.key);
    }
  });

  it('is deterministic', () => {
    expect(resolveTheme(variant())).toEqual(resolveTheme(variant()));
  });
});

describe('themeBaseFor', () => {
  it('uses the archetype a variant names', () => {
    const ats = themeBaseFor({ kind: 'archetype', id: 'ats-plain' });
    expect(ats.id).toBe('ats-plain');
    // ATS-plain: no fills behind the name, no side-by-side columns in entries.
    expect(ats.blocks).toEqual({ identity: 'stacked', entries: 'stacked', tags: 'inline', prose: 'plain' });
    expect(themeBaseFor({ kind: 'archetype', id: 'classic' }).blocks).toMatchObject({ identity: 'banner', entries: 'row' });
  });

  it('renders auto and presets as classic until they exist, and every archetype as itself', () => {
    for (const ref of [{ kind: 'auto' }, { kind: 'preset', id: 'netflix' }] as const) {
      expect(themeBaseFor(ref).id, JSON.stringify(ref)).toBe('classic');
    }
    for (const id of ['ats-plain', 'classic', 'sidebar', 'app-ui'] as const) expect(themeBaseFor({ kind: 'archetype', id }).id).toBe(id);
  });
});
