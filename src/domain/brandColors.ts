// LogoPalette → the logo's distinct brand colors, for the multi-colour brand option. Pure; lives in domain because
// both themes (which draw the colors) and brand (whose extractor feeds them) need it, and neither may import the other.
import type { LogoPalette, Oklch, Swatch } from './brand';

/** Most colors the multi-colour brand draws. Logos with more distinct hues than this are rare. */
export const MAX_BRAND_COLORS = 6;
/** Below this OKLCH chroma a swatch is a neutral (white, black, grey wordmark), not a brand color. */
const MIN_CHROMA = 0.04;
/** Near-white and near-black swatches are backdrops or outlines, whatever their chroma. */
const LIGHTNESS = [0.12, 0.985] as const;
/** Swatches closer than this OKLab distance read as one color (shades of one hue, anti-alias blends). */
const SAME_COLOR = 0.1;
/** A color under this share of the kept colors' area is a sliver, not a brand color. */
const MIN_SHARE = 0.03;
/**
 * Anti-aliasing leaves pixels that are a mix of two neighbouring colors (two brand colors, or one and the white
 * gap). A small swatch lying on the line between two heavier swatches in OKLab is such a blend.
 */
const BLEND_SHARE = 0.15;
const BLEND_DISTANCE = 0.05;

type Lab = readonly [number, number, number];
const toLab = ({ l, c, h }: Oklch): Lab => [l, c * Math.cos((h * Math.PI) / 180), c * Math.sin((h * Math.PI) / 180)];
const distance = (p: Lab, q: Lab) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
/** Distance from `p` to the segment a–b. */
function toSegment(p: Lab, a: Lab, b: Lab): number {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
  const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / len2));
  return distance(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]);
}

/** White and black: the usual gap or backdrop a logo color is blended with, even when the extractor dropped it. */
const BACKDROPS: readonly Lab[] = [
  [1, 0, 0],
  [0, 0, 0],
];

/** A light swatch that sits between two heavier ones (or one and white/black) is an edge blend. */
function isBlend(s: Swatch, all: readonly Swatch[]): boolean {
  if (s.weight >= BLEND_SHARE) return false;
  const p = toLab(s.color);
  const heavier = [...all.filter((o) => o.weight > s.weight * 2).map((o) => toLab(o.color)), ...BACKDROPS];
  return heavier.some((a, i) => heavier.slice(i + 1).some((b) => toSegment(p, a, b) < BLEND_DISTANCE));
}

interface Group {
  readonly color: Oklch;
  readonly lab: Lab;
  weight: number;
}

/**
 * Every distinct, meaningful color in the logo, heaviest (largest logo area) first, at most MAX_BRAND_COLORS.
 * Neutrals, near-white and near-black are dropped; so are anti-alias blends (a small swatch between two heavier
 * ones) and slivers; near-identical colors are merged into the heavier one. Empty for a monochrome or neutral logo: callers fall back to their accent.
 * Generic on purpose: nothing here knows any company.
 */
export function brandColors(palette: LogoPalette): readonly Oklch[] {
  const groups: Group[] = [];
  const { swatches } = palette;
  const candidates = swatches
    .filter((s) => !isBlend(s, swatches))
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
