import type { ArchetypeId, Customization, RoleChoice, ShapeName } from '@/domain';
import type { BlockVariants } from '@/primitives';
import type { AccessiblePalette } from './color';

/** One block variant per shape. ('bespoke' joins with presets, M6.) */
export type BlockStyles = { readonly [S in ShapeName]: BlockVariants[S] };

export interface Vocab {
  /** Word for an open-ended date range. */
  readonly present?: string;
}

/** Sizes in points at fontScale 1. */
export interface TypeScale {
  readonly name: number;
  readonly h2: number;
  readonly h3: number;
  readonly body: number;
  readonly small: number;
}
export interface TypographySpec {
  /** A CSS font stack. M3 archetypes use system fonts, so there is nothing to load. */
  readonly stack: string;
  readonly scale: TypeScale;
  readonly headingCase: 'none' | 'uppercase';
}

/** Colorless theme data. A generated theme = an archetype + the variant's derived palette. */
export interface ThemeBase {
  readonly id: ArchetypeId;
  readonly label: string;
  readonly blocks: BlockStyles;
  readonly vocab: Vocab;
  readonly typography: TypographySpec;
  readonly roleHints: RoleChoice;
}

/** Everything a renderer needs. Derived, never stored. */
export interface ResolvedTheme {
  /** Changes when anything about the rendering changes (colors included): memo key. */
  readonly key: string;
  /** Changes only when geometry can (type, spacing, block styles); colors never re-measure. Part of the measure cache key. */
  readonly styleHash: string;
  readonly base: ThemeBase;
  readonly palette: AccessiblePalette;
  readonly customization: Customization;
  /** Set on the page root: surface colors (via primitives' surfaceVar) and the --rs-* type and spacing variables. */
  readonly cssVars: Readonly<Record<`--${string}`, string>>;
  /** The space between sections, in points (the same value as `--rs-section-gap`); the engine's gapAfter. */
  readonly sectionGapPt: number;
}
