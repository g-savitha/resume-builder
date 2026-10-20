// The only minter of ContrastSafe. Internal to themes/color: not exported from its index.ts.
import type { Oklch } from '@/domain';
import { normalize, toHex } from './oklch';
import type { ContrastLevel, ContrastSafe } from './types';
import { contrastRatio, MIN_RATIO } from './wcag';

const BLACK = '#000000';
const WHITE = '#ffffff';
/** Lightness bisection steps: 2^-24 precision in L, far below one 8-bit step. */
const STEPS = 24;

/**
 * Moves `fg` in lightness only (hue kept, chroma gamut-mapped) by the least amount that reaches
 * `target` against `bgHex`. A color that already passes is returned unchanged. The caller must
 * pass a reachable target: at least one of black or white meets it.
 */
export function solveLightness(fg: Oklch, bgHex: string, target: number): Oklch {
  const start = normalize(fg);
  const passes = (l: number) => contrastRatio(toHex({ ...start, l }), bgHex) >= target;
  if (passes(start.l)) return start;
  let best: Oklch | undefined;
  for (const end of [0, 1]) {
    if (!passes(end)) continue;
    // Invariant: `lo` fails, `hi` passes. The result is always a passing `hi`.
    let lo = start.l;
    let hi = end;
    for (let i = 0; i < STEPS; i++) {
      const mid = (lo + hi) / 2;
      if (passes(mid)) hi = mid;
      else lo = mid;
    }
    if (!best || Math.abs(hi - start.l) < Math.abs(best.l - start.l)) best = { ...start, l: hi };
  }
  if (!best) throw new Error(`Contrast ${target}:1 is unreachable against ${bgHex}`);
  return best;
}

/** The highest ratio any color can reach against `bgHex` (pure black or pure white). */
export const maxRatio = (bgHex: string) => Math.max(contrastRatio(BLACK, bgHex), contrastRatio(WHITE, bgHex));

/**
 * Returns `fg` as a CSS color that meets `level` against `bg`, keeping its hue and adjusting
 * lightness only as much as needed. `aim` asks for a higher ratio (for example 7:1) when the
 * background allows it; the level's minimum is always met. Asserts before minting.
 */
export function ensureContrast<L extends ContrastLevel>(
  fg: Oklch,
  bg: Oklch,
  level: L,
  aim: number = MIN_RATIO[level],
): ContrastSafe<L> {
  const bgHex = toHex(bg);
  const min = MIN_RATIO[level];
  const target = Math.max(min, Math.min(aim, maxRatio(bgHex)));
  const hex = toHex(solveLightness(fg, bgHex, target));
  const ratio = contrastRatio(hex, bgHex);
  if (!(ratio >= min)) throw new Error(`ensureContrast: ${hex} on ${bgHex} is ${ratio.toFixed(2)}:1, below ${min}:1`);
  return hex as ContrastSafe<L>;
}
