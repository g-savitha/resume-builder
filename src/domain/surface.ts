// The surface vocabulary shared by themes (which solve contrast per surface) and primitives (which place content
// on a surface). Names only: the contrast policy itself (which level each role needs) stays in themes/color.
// Lives in the leaf for the same reason as the brand types (docs/design/deviations.md 1 and 34).

/** page = canvas; raised/sunken = cards, tiles, chips; accent = brand fill (buttons, bands) with its own on-colors. */
export const SURFACE_NAMES = ['page', 'raised', 'sunken', 'accent'] as const;
export type SurfaceName = (typeof SURFACE_NAMES)[number];

/** Every foreground solved against a surface's background. */
export const FOREGROUND_ROLES = ['text', 'muted', 'accentText', 'heading', 'icon', 'rule'] as const;
export type ForegroundRole = (typeof FOREGROUND_ROLES)[number];
