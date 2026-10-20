import type { LogoPalette, Oklch, Swatch } from '@/domain';

// Fixture brand palettes: realistic logo colors (named "-like": the colors, not the trademarks) plus
// the hard cases for contrast. OKLCH values are the listed hex colors converted with OKLab and rounded.
// Test-only minter of LogoPalette (production palettes come from the palette worker or the fallback).

const sw = (color: Oklch, weight: number, isGround = false): Swatch => ({ color, weight, isGround });
const logo = (swatches: readonly Swatch[]) => ({ swatches, source: 'logo' }) as LogoPalette;

const WHITE = { l: 1, c: 0, h: 0 };
const BLACK = { l: 0, c: 0, h: 0 };

export const FIXTURE_PALETTES = {
  /** Four squares on white: #f25022 #7fba00 #00a4ef #ffb900. */
  'microsoft-like': logo([
    sw(WHITE, 0.6, true),
    sw({ l: 0.6506, c: 0.2059, h: 35.64 }, 0.1),
    sw({ l: 0.7207, c: 0.1907, h: 128.86 }, 0.1),
    sw({ l: 0.6847, c: 0.1559, h: 239.64 }, 0.1),
    sw({ l: 0.829, c: 0.1712, h: 81.04 }, 0.1),
  ]),
  /** Blues into magenta on white: #26478d #406eb3 #632678 #982881 #ba2f7d. */
  'experian-like': logo([
    sw(WHITE, 0.55, true),
    sw({ l: 0.4135, c: 0.1227, h: 263.12 }, 0.15),
    sw({ l: 0.5389, c: 0.1199, h: 258.32 }, 0.1),
    sw({ l: 0.3956, c: 0.1415, h: 316.28 }, 0.07),
    sw({ l: 0.484, c: 0.1757, h: 337.53 }, 0.07),
    sw({ l: 0.5436, c: 0.1886, h: 350.97 }, 0.06),
  ]),
  /** Red #e50914 on black: a dark page. */
  'streaming-red-on-black': logo([sw(BLACK, 0.8, true), sw({ l: 0.5814, c: 0.2349, h: 27.99 }, 0.2)]),
  /** Green #1db954 on navy #0b1f3a. */
  'green-on-navy': logo([sw({ l: 0.2393, c: 0.0581, h: 256.66 }, 0.7, true), sw({ l: 0.6888, c: 0.187, h: 148.92 }, 0.3)]),
  /** Pure yellow #ffff00 on white: near-invisible as text, must darken. */
  'pure-yellow': logo([sw(WHITE, 0.7, true), sw({ l: 0.968, c: 0.211, h: 109.77 }, 0.3)]),
  /** Gray only, mid-tones (#767676 ground, #808080 #5a5a5a #9a9a9a): the worst luminance for any text. */
  'mid-greys': logo([
    sw({ l: 0.5658, c: 0, h: 0 }, 0.5, true),
    sw({ l: 0.5999, c: 0, h: 0 }, 0.2),
    sw({ l: 0.4676, c: 0, h: 0 }, 0.2),
    sw({ l: 0.6862, c: 0, h: 0 }, 0.1),
  ]),
  /** Mid-grey ground #767676 with a yellow #ffb900 mark. */
  'yellow-on-mid-grey': logo([sw({ l: 0.5658, c: 0, h: 0 }, 0.6, true), sw({ l: 0.829, c: 0.1712, h: 81.04 }, 0.4)]),
  /** Near-white marks #fafafa #f5f5f5 on white: no usable color at all. */
  'near-white': logo([sw(WHITE, 0.6, true), sw({ l: 0.9851, c: 0, h: 0 }, 0.3), sw({ l: 0.9702, c: 0, h: 0 }, 0.1)]),
  /** Pastels: pink ground #ffd1dc, #c1e1c1 #b5d8f7. */
  pastel: logo([
    sw({ l: 0.9032, c: 0.0535, h: 2.19 }, 0.5, true),
    sw({ l: 0.8778, c: 0.0551, h: 145.09 }, 0.3),
    sw({ l: 0.8671, c: 0.057, h: 245.25 }, 0.2),
  ]),
  /** Neon #39ff14 and #ff00ff on black. */
  neon: logo([sw(BLACK, 0.6, true), sw({ l: 0.8714, c: 0.286, h: 141.53 }, 0.2), sw({ l: 0.7017, c: 0.3225, h: 328.36 }, 0.2)]),
  /** Transparent logo: one red mark, no ground swatch. */
  'no-ground': logo([sw({ l: 0.5814, c: 0.2349, h: 27.99 }, 1)]),
  /** Nothing extracted. */
  empty: logo([]),
} as const satisfies Record<string, LogoPalette>;

export type FixturePaletteName = keyof typeof FIXTURE_PALETTES;
