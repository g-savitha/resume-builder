import type { FontPairId } from '@/domain';

/**
 * Font choices for the customization panel. System stacks only: nothing to download, so the preview, the PDF and the
 * CSP stay simple. `undefined` (no fontPair) keeps the archetype's own stack.
 */
export const FONT_PAIRS = {
  serif: { label: 'Serif (Georgia)', stack: "Georgia, 'Times New Roman', 'Liberation Serif', serif" },
  sans: { label: 'Sans (Helvetica / Arial)', stack: "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif" },
  system: { label: 'System UI', stack: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" },
  humanist: { label: 'Humanist (Verdana / Tahoma)', stack: "Verdana, Tahoma, 'DejaVu Sans', sans-serif" },
} as const;
export type FontPairKey = keyof typeof FONT_PAIRS;
export const FONT_PAIR_KEYS = Object.keys(FONT_PAIRS) as readonly FontPairKey[];

const PAIRS: Readonly<Record<string, { readonly stack: string } | undefined>> = FONT_PAIRS;

/** The stack for a stored font pair id, or undefined for none/unknown (an id from a newer build). */
export const fontStack = (id: FontPairId | undefined): string | undefined => (id === undefined ? undefined : PAIRS[id]?.stack);

/** The stored id for a font pair key (the only place a FontPairId is minted). */
export const fontPairId = (key: FontPairKey): FontPairId => key as FontPairId;
