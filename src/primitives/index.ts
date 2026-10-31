// primitives: the closed block kit every theme renders with. Owns resume semantics (h1–h3, ul/li, a href),
// the data hooks the measurer reads (data-block, data-atom, data-keep-with-next, data-keep-together), the surface
// CSS-variable contract, and the no-outer-margin rule.
export { Atom, ALL_ATOMS, type AtomProps, type AtomRange } from './Atom';
export {
  BlockView,
  ContactList,
  continuedHeading,
  type BlockContent,
  type BlockIcons,
  type BrandMarks,
  type BlockShapeProps,
  type BlockVariants,
  type BlockViewProps,
} from './blocks';
export { BespokeProvider, type BespokeBlocks, type BespokeEntryHeadProps, type BespokeIdentityProps } from './bespoke';
export { Centerpiece, ScoreDial, type CenterpieceData, type ScoreDialData } from './centerpieces';
export { formatDateRange } from './dates';
export { Decor } from './Decor';
export { RichTextView, richAtomCount, type RichTextViewProps } from './RichTextView';
export { fgMarkVar, fgVar, markVar, OnSurface, surfaceVar, type OnSurfaceProps } from './surface';
export { Heading, Text, type Tone } from './text';
export { THEME_VARS, type ThemeVar } from './themeVars';
