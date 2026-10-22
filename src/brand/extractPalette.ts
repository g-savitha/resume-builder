// Logo pixels → LogoPalette. Pure and DOM-free, so it is tested on synthetic pixel buffers; decodeImage.ts
// turns a real image into these pixels in the browser. The second legal minter of LogoPalette (the other is
// the name-hash fallback).
import type { LogoPalette, Oklch, Swatch } from '@/domain';

/** RGBA bytes, row-major, as canvas `getImageData` returns them. */
export interface Pixels {
  readonly data: ArrayLike<number>;
  readonly width: number;
  readonly height: number;
}

type Lab = readonly [number, number, number];

/** Pixels at or below this alpha are transparent background, not logo. */
const MIN_ALPHA = 128;
/** Median-cut boxes before merging. A logo rarely has more distinct brand colors than this. */
const MAX_BOXES = 8;
/** Clusters closer than this OKLab distance are one color (anti-aliasing, JPEG noise). */
const MERGE_DISTANCE = 0.06;
/** Clusters under this share of the logo are edge noise, not a brand color. */
const MIN_WEIGHT = 0.02;
/** A border color covering this share of the opaque border is the image's backdrop. */
const BACKDROP_SHARE = 0.5;
/** Below this chroma a color is a neutral (white, black or grey). */
const NEUTRAL_CHROMA = 0.03;

const toLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** 8-bit sRGB → OKLab (Björn Ottosson). */
function toLab(r8: number, g8: number, b8: number): Lab {
  const r = toLinear(r8);
  const g = toLinear(g8);
  const b = toLinear(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function toOklch([l, a, b]: Lab): Oklch {
  const c = Math.hypot(a, b);
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { l: Math.min(1, Math.max(0, l)), c, h: c < 1e-4 ? 0 : (h + 360) % 360 };
}

const distance = (p: Lab, q: Lab) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const mean = (points: readonly Lab[]): Lab => {
  const sum = points.reduce<[number, number, number]>((acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]], [0, 0, 0]);
  return [sum[0] / points.length, sum[1] / points.length, sum[2] / points.length];
};

/**
 * Box cut in OKLab: split the box with the widest channel range at the middle of that range until MAX_BOXES.
 * Splitting at the range midpoint (not the count median) keeps a big backdrop from eating boxes that a
 * small brand color needs.
 */
function boxCut(points: readonly Lab[]): Lab[][] {
  const boxes: Lab[][] = [[...points]];
  const range = (box: readonly Lab[], axis: 0 | 1 | 2) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of box) {
      lo = Math.min(lo, p[axis]);
      hi = Math.max(hi, p[axis]);
    }
    return [lo, hi] as const;
  };
  while (boxes.length < MAX_BOXES) {
    let best = -1;
    let axis: 0 | 1 | 2 = 0;
    let cut = 0;
    let widest = 0;
    boxes.forEach((box, i) => {
      for (const a of [0, 1, 2] as const) {
        const [lo, hi] = range(box, a);
        if (hi - lo > widest) [best, axis, cut, widest] = [i, a, (lo + hi) / 2, hi - lo];
      }
    });
    if (best < 0 || widest < MERGE_DISTANCE / 2) break;
    const box = boxes[best] ?? [];
    boxes.splice(best, 1, box.filter((p) => p[axis] < cut), box.filter((p) => p[axis] >= cut));
  }
  return boxes.filter((b) => b.length > 0);
}

interface Cluster {
  readonly center: Lab;
  readonly count: number;
}

/** Greedy merge of near-identical clusters, heaviest first, weighted by pixel count. */
function merge(clusters: readonly Cluster[]): Cluster[] {
  const out: Cluster[] = [];
  for (const c of [...clusters].sort((a, b) => b.count - a.count)) {
    const i = out.findIndex((o) => distance(o.center, c.center) < MERGE_DISTANCE);
    const into = out[i];
    if (!into) {
      out.push(c);
      continue;
    }
    const n = into.count + c.count;
    const w = (k: 0 | 1 | 2) => (into.center[k] * into.count + c.center[k] * c.count) / n;
    out[i] = { center: [w(0), w(1), w(2)], count: n };
  }
  return out;
}

const mint = (swatches: readonly Swatch[]): LogoPalette =>
  // The extractor is a legal minter of LogoPalette: every swatch here came from logo pixels.
  ({ swatches, source: 'logo' }) as LogoPalette;

/**
 * The logo's brand colors, heaviest first, with weights summing to 1.
 * - Transparent pixels are ignored.
 * - A neutral backdrop (white, black or grey covering most of the image border, as in a JPG or a favicon
 *   on a plain tile) is dropped, unless nothing else is left. A colored tile is kept: it is the brand color.
 * - No swatch is a ground: a logo's own background never decides the page, so every logo-themed page is
 *   white (deviation 50, building on 24 and 46).
 */
export function extractPalette(px: Pixels): LogoPalette {
  const { data, width, height } = px;
  const points: Lab[] = [];
  const border: Lab[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if ((data[i + 3] ?? 0) <= MIN_ALPHA) continue;
      const lab = toLab(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      points.push(lab);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) border.push(lab);
    }
  }
  if (points.length === 0) return mint([]);

  const clusters = merge(boxCut(points).map((box) => ({ center: mean(box), count: box.length })));
  const nearest = (p: Lab) =>
    clusters.reduce((best, c, i) => (distance(p, c.center) < distance(p, clusters[best]?.center ?? c.center) ? i : best), 0);
  const borderHits = new Map<number, number>();
  for (const p of border) borderHits.set(nearest(p), (borderHits.get(nearest(p)) ?? 0) + 1);
  const backdrop = [...borderHits].find(
    ([i, hits]) => hits >= border.length * BACKDROP_SHARE && toOklch(clusters[i]?.center ?? [0, 0, 0]).c < NEUTRAL_CHROMA,
  )?.[0];

  const kept = clusters.filter((_, i) => i !== backdrop);
  const logo = kept.length > 0 ? kept : clusters;
  const total = logo.reduce((n, c) => n + c.count, 0);
  const significant = logo.filter((c) => c.count / total >= MIN_WEIGHT);
  const sum = significant.reduce((n, c) => n + c.count, 0);
  return mint(
    significant
      .sort((a, b) => b.count - a.count)
      .map((c) => ({ color: toOklch(c.center), weight: c.count / sum, isGround: false })),
  );
}
