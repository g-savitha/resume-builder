// themes/color: the contrast core. derivePalette is the sole minter of AccessiblePalette; ensureContrast
// (the sole minter of ContrastSafe) stays private to this folder and is deliberately not exported here.
export { derivePalette } from './derivePalette';
export { colorName, rolePreview, swatchOptions, type RoleColors, type RolePreview, type SwatchOption } from './swatches';
export {
  SURFACE_FOREGROUNDS,
  type AccessiblePalette,
  type ContrastLevel,
  type ContrastReportEntry,
  type ContrastSafe,
  type CssColor,
  type ForegroundRole,
  type Surface,
  type SurfaceName,
} from './types';
