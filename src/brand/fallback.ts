import type { BrandProfile, LogoPalette, Swatch } from '@/domain';

/** FNV-1a: a stable 32-bit hash so the same company name always gets the same hue. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (const ch of text.toLowerCase().trim()) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The name-hash fallback profile, used when no logo can be obtained (and, in milestone 1,
 * for every variant: the logo pipeline lands in milestone 4). One of the two legal minters
 * of LogoPalette (the other is the palette worker).
 */
export function fallbackProfile({ name, now }: { readonly name: string; readonly now: number }): BrandProfile {
  const hue = hash(name) % 360;
  const swatches: readonly Swatch[] = [
    { color: { l: 0.98, c: 0.01, h: hue }, weight: 0.6, isGround: true },
    { color: { l: 0.55, c: 0.16, h: hue }, weight: 0.3, isGround: false },
    { color: { l: 0.3, c: 0.05, h: hue }, weight: 0.1, isGround: false },
  ];
  const palette = { swatches, source: 'fallback' } as const;
  return { name: name.trim() || 'Untitled company', palette: palette as LogoPalette, fetchedAt: now };
}
