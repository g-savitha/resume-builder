// LogoPalette + RoleChoice → AccessiblePalette. Total: always returns, and every foreground on
// every surface passes its contrast level by construction (each one is minted by ensureContrast).
import type { LogoPalette, Oklch, RoleChoice, Swatch, SwatchPick, SwatchStrategy } from '@/domain';
import { ensureContrast, solveLightness } from './ensureContrast';
import { normalize, toHex } from './oklch';
import {
  SURFACE_FOREGROUNDS,
  type AccessiblePalette,
  type ContrastReportEntry,
  type CssColor,
  type ForegroundRole,
  type Surface,
  type SurfaceName,
} from './types';
import { contrastRatio, MIN_RATIO } from './wcag';

/** Below this chroma a swatch has no meaningful hue, so neutrals derived from it stay untinted. */
const ACHROMATIC = 0.02;
const WHITE: Oklch = { l: 1, c: 0, h: 0 };
const GREY: Oklch = { l: 0.45, c: 0, h: 0 };
/** Text targeted when `boost` is on (WCAG AAA). Best effort: a mid-tone background cannot reach it. */
const BOOST_RATIO = 7;

/** Dark-ground brands keep a dark page, lightly tinted with the ground's hue. */
const DARK_PAGE_L = [0.14, 0.2] as const;
const PAGE_MAX_CHROMA = 0.03;
/** Lightness offset of raised / sunken surfaces from the page. */
const ELEVATION = { light: { raised: -0.04, sunken: -0.08 }, dark: { raised: 0.06, sunken: -0.04 } } as const;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function byStrategy(swatches: readonly Swatch[], strategy: SwatchStrategy): Swatch | undefined {
  const best = (score: (s: Swatch) => number, from = swatches) =>
    from.reduce<Swatch | undefined>((top, s) => (top === undefined || score(s) > score(top) ? s : top), undefined);
  switch (strategy) {
    case 'ground':
      return best((s) => s.weight, swatches.filter((s) => s.isGround));
    case 'most-chromatic':
      return best((s) => s.color.c);
    case 'most-weighted':
      return best((s) => s.weight);
    case 'darkest':
      return best((s) => -s.color.l);
    case 'lightest':
      return best((s) => s.color.l);
    default: {
      const _exhaustive: never = strategy;
      return _exhaustive;
    }
  }
}

/** An index into this snapshot's palette, or a strategy. A stale index falls back to the role's default strategy. */
function pick(swatches: readonly Swatch[], choice: SwatchPick, fallback: SwatchStrategy): Oklch | undefined {
  const swatch = typeof choice === 'number' ? (swatches[choice] ?? byStrategy(swatches, fallback)) : byStrategy(swatches, choice);
  return swatch && normalize(swatch.color);
}

/** A near-neutral at lightness `l`, tinted with the brand hue when the brand has one. */
const tint = (hue: Oklch, l: number, c: number): Oklch => ({ l, c: hue.c < ACHROMATIC ? 0 : Math.min(c, hue.c), h: hue.h });

/** Where the foregrounds of one surface start before ensureContrast adjusts them. */
interface Sources {
  readonly ink: Oklch;
  readonly heading: Oklch;
  readonly muted: Oklch;
  readonly brand: Oklch;
  readonly rule: Oklch;
}

function mintSurface(bg: Oklch, src: Sources, boost: boolean): Surface {
  const aim = boost ? BOOST_RATIO : undefined;
  const mint = <K extends ForegroundRole>(role: K, color: Oklch, target?: number) =>
    ensureContrast(color, bg, SURFACE_FOREGROUNDS[role], target);
  return {
    bg: toHex(bg) as CssColor,
    text: mint('text', src.ink, aim),
    heading: mint('heading', src.heading, aim),
    muted: mint('muted', src.muted),
    accentText: mint('accentText', src.brand),
    icon: mint('icon', src.brand),
    rule: mint('rule', src.rule),
  };
}

/** Ink poles for a background: dark text on light backgrounds, light text on dark ones. */
function inkFor(bg: Oklch, hue: Oklch) {
  const bgHex = toHex(bg);
  const lightInk = contrastRatio('#ffffff', bgHex) > contrastRatio('#000000', bgHex);
  return {
    ink: tint(hue, lightInk ? 0.96 : 0.22, 0.02),
    heading: tint(hue, lightInk ? 0.97 : 0.25, 0.06),
    muted: tint(hue, lightInk ? 0.78 : 0.48, 0.02),
  };
}

/**
 * Derives the four surfaces of a resume theme from a logo palette. The ground swatch sets the mode: a light
 * ground gets a pure white page with neutral raised/sunken surfaces, a dark ground a dark, lightly tinted page; the accent swatch becomes the brand fill and the brand-colored foregrounds. Brand
 * colors are never used raw behind text: each foreground keeps its hue and moves in lightness only as far
 * as its contrast level requires.
 */
export function derivePalette(palette: LogoPalette, roles: RoleChoice): AccessiblePalette {
  const { swatches } = palette;
  const ground = pick(swatches, roles.ground, 'ground') ?? WHITE;
  const accent = pick(swatches, roles.accent, 'most-chromatic') ?? GREY;
  const secondary = roles.secondary === undefined ? undefined : pick(swatches, roles.secondary, 'most-chromatic');
  const boost = roles.boost === 1;

  const mode = ground.l < 0.5 ? 'dark' : 'light';
  // Light mode: the paper is pure white and the neutrals are untinted, whatever the ground swatch's tint
  // (owner decision, deviation 46). The brand shows in the accent fill and the brand-colored foregrounds.
  const page: Oklch =
    mode === 'light' ? WHITE : { l: clamp(ground.l, DARK_PAGE_L[0], DARK_PAGE_L[1]), c: Math.min(ground.c, PAGE_MAX_CHROMA), h: ground.h };
  const raised: Oklch = { ...page, l: page.l + ELEVATION[mode].raised };
  const sunken: Oklch = { ...page, l: page.l + ELEVATION[mode].sunken };

  // The accent fill is the logo color itself, adjusted only if it would not stand out 3:1 from the page.
  // Its own foregrounds are then solved against it, so text on it always passes as well.
  const accentBg = solveLightness(accent, toHex(page), MIN_RATIO['AA-ui']);

  // Headings on the page and cards start from the brand color itself (deviation 57); ensureContrast then moves
  // it in lightness only as far as AA (or the 7:1 boost) needs. A grey brand still gets grey headings.
  const onNeutral = (bg: Oklch): Sources => ({ ...inkFor(bg, accent), heading: accent, brand: accent, rule: secondary ?? accent });
  const onAccent = (bg: Oklch): Sources => {
    const poles = inkFor(bg, accent);
    return { ...poles, brand: secondary ?? poles.ink, rule: poles.ink };
  };

  const surfaces: Record<SurfaceName, Surface> = {
    page: mintSurface(page, onNeutral(page), boost),
    raised: mintSurface(raised, onNeutral(raised), boost),
    sunken: mintSurface(sunken, onNeutral(sunken), boost),
    accent: mintSurface(accentBg, onAccent(accentBg), boost),
  };
  return { mode, surfaces, report: report(surfaces) } as AccessiblePalette;
}

function report(surfaces: Readonly<Record<SurfaceName, Surface>>): readonly ContrastReportEntry[] {
  const roles = Object.keys(SURFACE_FOREGROUNDS) as ForegroundRole[];
  return (Object.keys(surfaces) as SurfaceName[]).flatMap((name) =>
    roles.map((fg) => ({ surface: name, fg, ratio: contrastRatio(surfaces[name][fg], surfaces[name].bg) })),
  );
}
