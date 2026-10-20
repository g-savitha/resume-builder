// WCAG 2.2 contrast (success criteria 1.4.3 and 1.4.11), computed on 8-bit sRGB hex colors.
import { hexToLinearRgb, LINEAR_8BIT, type Rgb8 } from './oklch';
import type { ContrastLevel } from './types';

/** The minimum ratio each level guarantees: 4.5:1 for text, 3:1 for icons, rules and other UI marks. */
export const MIN_RATIO = { 'AA-text': 4.5, 'AA-ui': 3 } as const satisfies Record<ContrastLevel, number>;

const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** WCAG relative luminance of a `#rrggbb` color. */
export function relativeLuminance(hex: string): number {
  return luminance(...hexToLinearRgb(hex));
}

/** WCAG relative luminance of 8-bit sRGB channels (the same value `relativeLuminance` gives for their hex). */
export function luminanceOfRgb8([r, g, b]: Rgb8): number {
  return luminance(LINEAR_8BIT[r] ?? 0, LINEAR_8BIT[g] ?? 0, LINEAR_8BIT[b] ?? 0);
}

/** WCAG contrast ratio between two relative luminances. Symmetric. */
export const ratioOfLuminances = (ya: number, yb: number) => (Math.max(ya, yb) + 0.05) / (Math.min(ya, yb) + 0.05);

/** WCAG contrast ratio between two `#rrggbb` colors, in [1, 21]. Symmetric. */
export function contrastRatio(a: string, b: string): number {
  return ratioOfLuminances(relativeLuminance(a), relativeLuminance(b));
}
