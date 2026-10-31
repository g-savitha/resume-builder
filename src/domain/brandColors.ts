// LogoPalette → the logo's distinct brand colors, for the multi-colour brand option. Pure; lives in domain because
// both themes (which draw the colors) and brand (whose extractor feeds them) need it, and neither may import the other.
import type { LogoPalette, Oklch } from './brand';

/** Most colors the multi-colour brand draws. Logos with more distinct hues than this are rare. */
export const MAX_BRAND_COLORS = 6;
/** Below this OKLCH chroma a swatch is a neutral (white, black, grey wordmark), not a brand color. */
const MIN_CHROMA = 0.04;
/** Near-white and near-black swatches are backdrops or outlines, whatever their chroma. */
const LIGHTNESS = [0.12, 0.96] as const;
/** Swatches closer than this OKLab distance read as one color (shades of one hue, anti-alias blends). */
const SAME_COLOR = 0.1;
/** A color under this share of the kept colors' area is an edge blend between two others, not a brand color. */
const MIN_SHARE = 0.03;

type Lab = readonly [number, number, number];
const toLab = ({ l, c, h }: Oklch): Lab => [l, c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];
const distance = (p: Lab, q: Lab) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

interface Group {
  readonly color: Oklch;
  readonly lab: Lab;
  weight: number;
}

/**
 * Every distinct, meaningful color in the logo, heaviest (largest logo area) first, at most MAX_BRAND_COLORS.
 * Neutrals, near-white and near-black are dropped; near-identical colors are merged into the heavier one; slivers
 * (anti-alias blends) are dropped. Empty for a monochrome or neutral logo: callers fall back to their accent.
 * Generic on purpose: nothing here knows any company.
 */
export function brandColors(palette: LogoPalette): readonly Oklch[] {
  const groups: Group[] = [];
  const candidates = palette.swatches
    .filter((s) => s.color.c >= MIN_CHROMA && s.color.l > LIGHTNESS[0] && s.color.l < LIGHTNESS[1])
    .sort((a, b) => b.weight - a.weight);
  for (const s of candidates) {
    const lab = toLab(s.color);
    const same = groups.find((g) => distance(g.lab, lab) < SAME_COLOR);
    if (same) same.weight += s.weight;
    else groups.push({ color: s.color, lab, weight: s.weight });
  }
  const total = groups.reduce((n, g) => n + g.weight, 0);
  return groups
    .filter((g) => g.weight >= total * MIN_SHARE)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_BRAND_COLORS)
    .map((g) => g.color);
}
