/**
 * The type and spacing variables the block kit's CSS reads (primitives.module.css). A theme must set every one;
 * themes/ types its output as Record<ThemeVar, string>, and a test keeps this list equal to what the CSS uses.
 */
export const THEME_VARS = [
  '--rs-font',
  '--rs-name',
  '--rs-h2',
  '--rs-h3',
  '--rs-body',
  '--rs-small',
  '--rs-h2-case',
  '--rs-h2-tracking',
  '--rs-leading',
  '--rs-head-gap',
  '--rs-item-gap',
  '--rs-atom-gap',
  '--rs-banner-pad',
  '--rs-section-gap',
] as const;
export type ThemeVar = (typeof THEME_VARS)[number];
