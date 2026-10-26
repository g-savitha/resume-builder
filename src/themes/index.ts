// themes: theme as data. An archetype (colorless ThemeBase) + the variant's AccessiblePalette = a ResolvedTheme.
// themes/color is the contrast core; ensureContrast stays private to it.
export type {
  AccessiblePalette,
  ContrastLevel,
  ContrastReportEntry,
  ContrastSafe,
  CssColor,
  ForegroundRole,
  Surface,
  SurfaceName,
} from './color';
export { rolePreview, swatchOptions, type RoleColors, type RolePreview, type SwatchOption } from './color';
export { resolveTheme, themeBaseFor } from './resolve';
export { VOCAB_WORDS } from './vocab';
export { PRESET_IDS, PRESETS } from './presets';
export { FONT_PAIR_KEYS, FONT_PAIRS, fontPairId, type FontPairKey } from './fonts';
export { ARCHETYPES, type ImplementedArchetype } from './archetypes';
export type { BlockStyles, LayoutSpec, ResolvedTheme, ThemeBase, TypeScale, TypographySpec, Vocab } from './types';
