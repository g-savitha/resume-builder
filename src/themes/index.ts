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
export { ARCHETYPES, type ImplementedArchetype } from './archetypes';
export type { BlockStyles, ResolvedTheme, ThemeBase, TypeScale, TypographySpec, Vocab } from './types';
