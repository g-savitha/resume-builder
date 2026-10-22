// What the Design tab's swatch picker shows: the logo's swatches as choosable colors, and what a role choice
// actually renders as after derivePalette's contrast adjustments. Pure; the picker never mints a color itself.
import type { LogoPalette, Oklch, RoleChoice } from '@/domain';
import { derivePalette, pick } from './derivePalette';
import { normalize, toHex } from './oklch';

/** One logo swatch the user can pick for the accent or the secondary role. */
export interface SwatchOption {
  /** Index into the palette's swatches: the numeric `SwatchPick` that selects it. */
  readonly index: number;
  /** The swatch as the logo has it, before any contrast adjustment. */
  readonly hex: string;
  /** A plain color name for labels and announcements ("blue", "dark green"). */
  readonly name: string;
  /** Share of the logo's colored pixels, 0–1. */
  readonly share: number;
}

/** How one role renders: the swatch it starts from and the colors derivePalette emitted for it. */
export interface RoleColors {
  readonly swatch: string;
  /** Where it shows on the white page: the banner fill (accent) or rules and marks (secondary). */
  readonly fill: string;
  /** Brand-colored text on the page: headings (accent), or the banner's brand text (secondary). */
  readonly text: string;
  /** True when contrast moved either color away from the swatch. */
  readonly adjusted: boolean;
}

export interface RolePreview {
  readonly accent?: RoleColors;
  readonly secondary?: RoleColors;
}

const ACHROMATIC = 0.03;
/** Upper hue bounds (OKLCH degrees) of each name; red wraps around 0. */
const HUES: readonly (readonly [number, string])[] = [
  [45, 'red'],
  [75, 'orange'],
  [110, 'yellow'],
  [170, 'green'],
  [200, 'teal'],
  [265, 'blue'],
  [305, 'purple'],
  [345, 'pink'],
  [360, 'red'],
];

/** A plain name for a color, for labels a screen reader can say. Coarse on purpose: the hex is always shown too. */
export function colorName(color: Oklch): string {
  const { l, c, h } = normalize(color);
  if (c < ACHROMATIC) return l > 0.92 ? 'white' : l < 0.2 ? 'black' : l < 0.45 ? 'dark grey' : l > 0.8 ? 'light grey' : 'grey';
  const hue = ((h % 360) + 360) % 360;
  const name = HUES.find(([max]) => hue < max)?.[1] ?? 'red';
  return l < 0.45 ? `dark ${name}` : l > 0.88 ? `light ${name}` : name;
}

/**
 * The swatches a user may pick from, in palette order (heaviest first for extracted logos). Ground swatches are
 * left out: the page stays white (deviation 46), so there is no ground choice to offer.
 */
export function swatchOptions(palette: LogoPalette): readonly SwatchOption[] {
  const colored = palette.swatches.filter((s) => !s.isGround);
  const total = colored.reduce((sum, s) => sum + s.weight, 0) || 1;
  return palette.swatches.flatMap((s, index) =>
    s.isGround ? [] : [{ index, hex: toHex(normalize(s.color)), name: colorName(s.color), share: s.weight / total }],
  );
}

/** What the variant's accent and secondary choices render as, so the picker can say when contrast changed them. */
export function rolePreview(palette: LogoPalette, roles: RoleChoice): RolePreview {
  const { surfaces } = derivePalette(palette, roles);
  const describe = (color: Oklch | undefined, fill: string, text: string): RoleColors | undefined => {
    if (!color) return undefined;
    const swatch = toHex(color);
    return { swatch, fill, text, adjusted: fill !== swatch || text !== swatch };
  };
  const accent = describe(pick(palette.swatches, roles.accent, 'most-chromatic'), surfaces.accent.bg, surfaces.page.heading);
  const secondary =
    roles.secondary === undefined
      ? undefined
      : describe(pick(palette.swatches, roles.secondary, 'most-chromatic'), surfaces.page.rule, surfaces.accent.accentText);
  return { ...(accent ? { accent } : {}), ...(secondary ? { secondary } : {}) };
}
