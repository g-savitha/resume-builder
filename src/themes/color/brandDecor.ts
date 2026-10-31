// The multi-colour brand's colors: the raw logo colors for purely decorative fills (the strip), and each of them
// solved to 3:1 (AA-ui) against every surface for marks that sit on a surface (section rules, card edges).
import { brandColors, type LogoPalette, type Oklch, type RoleChoice, type SurfaceName } from '@/domain';
import { pick } from './derivePalette';
import { ensureContrast } from './ensureContrast';
import { gamutMap, hexToOklch, toHex } from './oklch';
import type { AccessiblePalette, ContrastSafe, CssColor } from './types';

export interface BrandDecor {
  /** The logo colors as they are, heaviest first. Decoration only: never behind or as text. */
  readonly strip: readonly CssColor[];
  /** Per surface, the same colors in the same order, each at ≥ 3:1 against that surface's background. */
  readonly marks: Readonly<Record<SurfaceName, readonly ContrastSafe<'AA-ui'>[]>>;
}

const GREY: Oklch = { l: 0.45, c: 0, h: 0 };

/**
 * The logo's brand colors (domain `brandColors`). A monochrome or neutral logo has none: then the set is the one
 * accent color the variant already uses, so the option degrades to a single-color strip instead of disappearing.
 */
export function brandDecor(logo: LogoPalette, roles: RoleChoice, palette: AccessiblePalette): BrandDecor {
  const colors = brandColors(logo);
  const set = colors.length > 0 ? colors : [pick(logo.swatches, roles.accent, 'most-chromatic') ?? GREY];
  const marksOn = (surface: SurfaceName) => {
    const bg = hexToOklch(palette.surfaces[surface].bg);
    return set.map((c) => ensureContrast(c, bg, 'AA-ui'));
  };
  const marks: Record<SurfaceName, readonly ContrastSafe<'AA-ui'>[]> = {
    page: marksOn('page'),
    raised: marksOn('raised'),
    sunken: marksOn('sunken'),
    accent: marksOn('accent'),
  };
  return { strip: set.map((c) => toHex(gamutMap(c)) as CssColor), marks };
}
