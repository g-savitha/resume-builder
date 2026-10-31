import type { ArchetypeId, CenterpieceId, Customization, RoleChoice, ShapeName, SurfaceName } from '@/domain';
import type { BespokeBlocks, BlockVariants } from '@/primitives';
import type { AccessiblePalette } from './color';

/** One block variant per shape. `bespoke` needs the theme's `bespoke` components (presets). */
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

/**
 * Where sections go on the page. `single`: one column. `columns`: a main column plus a side column (M5), each
 * paginated on its own; the side column is filled with `sideSurface` from the top to the bottom of every page.
 */
export type LayoutSpec =
  | { readonly kind: 'single' }
  | {
      readonly kind: 'columns';
      readonly side: 'left' | 'right';
      /** Share of the content width the side column takes. */
      readonly sideFraction: number;
      /** Section kinds placed in the side column; everything else flows in the main column. */
      readonly sideKinds: readonly string[];
      readonly identityIn: 'main' | 'side';
      readonly sideSurface: SurfaceName;
    };

/** Colorless theme data. A generated theme = an archetype + the variant's derived palette. */
export interface ThemeBase {
  /** An archetype id, or a preset's folder name. */
  readonly id: ArchetypeId | (string & {});
  readonly label: string;
  readonly blocks: BlockStyles;
  /** Block styles for the side column (columns layouts only); defaults to `blocks`. */
  readonly sideBlocks?: Partial<BlockStyles>;
  readonly layout: LayoutSpec;
  readonly vocab: Vocab;
  readonly typography: TypographySpec;
  readonly roleHints: RoleChoice;
  /** Presets only: their bespoke identity / entry-head components (primitives' escape hatch). */
  readonly bespoke?: BespokeBlocks;
  /** `ignore`: the theme stays plain when the variant turns on the multi-colour brand (ATS plain). */
  readonly multiColor?: 'ignore';
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
  /** Persona heading words by section kind (used when the user has not renamed the section). */
  readonly headings: Readonly<Record<string, string>>;
  /** The persona's centerpiece, drawn in the identity block. */
  readonly centerpiece: CenterpieceId;
  /** How many logo colors the multi-colour brand draws; 0 when it is off (or the theme ignores it). */
  readonly brandColorCount: number;
}
