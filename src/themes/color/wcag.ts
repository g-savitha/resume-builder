// WCAG 2.2 contrast (success criteria 1.4.3 and 1.4.11), computed on 8-bit sRGB hex colors.
import { hexToLinearRgb } from './oklch';
import type { ContrastLevel } from './types';

/** The minimum ratio each level guarantees: 4.5:1 for text, 3:1 for icons, rules and other UI marks. */
export const MIN_RATIO = { 'AA-text': 4.5, 'AA-ui': 3 } as const satisfies Record<ContrastLevel, number>;

/** WCAG relative luminance of a `#rrggbb` color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two `#rrggbb` colors, in [1, 21]. Symmetric. */
export function contrastRatio(a: string, b: string): number {
  const ya = relativeLuminance(a);
  const yb = relativeLuminance(b);
  return (Math.max(ya, yb) + 0.05) / (Math.min(ya, yb) + 0.05);
}
