// OKLCH ⇄ sRGB conversion and gamut mapping (Björn Ottosson's OKLab, as used by CSS Color 4).
// Every color the palette emits goes through `toHex`, so contrast is always measured on the
// exact 8-bit value that renders, never on an unrounded intermediate.
import type { Oklch } from '@/domain';

type Rgb = readonly [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Unclamped linear sRGB. Channels outside [0, 1] mean the color is out of gamut. */
function oklchToLinearRgb({ l, c, h }: Oklch): Rgb {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const EPS = 1e-6;
const inGamut = (rgb: Rgb) => rgb.every((ch) => ch >= -EPS && ch <= 1 + EPS);

/** Finite, in-range OKLCH: L in [0, 1], C ≥ 0, H in [0, 360). Inputs are trusted types but numbers can still be NaN. */
export function normalize({ l, c, h }: Oklch): Oklch {
  const turn = Number.isFinite(h) ? h % 360 : 0;
  const hue = turn < 0 ? turn + 360 : turn;
  return { l: Number.isFinite(l) ? clamp(l, 0, 1) : 0, c: Number.isFinite(c) ? Math.max(0, c) : 0, h: hue };
}

/** Keeps L and H, lowers chroma until the color fits sRGB (CSS Color 4 style, chroma bisection). */
export function gamutMap(color: Oklch): Oklch {
  const col = normalize(color);
  if (inGamut(oklchToLinearRgb(col))) return col;
  let lo = 0;
  let hi = col.c;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinearRgb({ ...col, c: mid }))) lo = mid;
    else hi = mid;
  }
  return { ...col, c: lo };
}

const byte = (linear: number) => Math.round(clamp(toGamma(clamp(linear, 0, 1)), 0, 1) * 255);
const hex2 = (n: number) => n.toString(16).padStart(2, '0');

/** The CSS color (`#rrggbb`) of an OKLCH color, gamut-mapped into sRGB. */
export function toHex(color: Oklch): string {
  const [r, g, b] = oklchToLinearRgb(gamutMap(color));
  return `#${hex2(byte(r))}${hex2(byte(g))}${hex2(byte(b))}`;
}

/** `#rrggbb` → linear sRGB channels in [0, 1]. */
export function hexToLinearRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

/** `#rrggbb` → OKLCH. Used for fixtures and to check that adjustments keep the hue. */
export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = hexToLinearRgb(hex);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(a, bb);
  const h = c < 1e-7 ? 0 : ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}
