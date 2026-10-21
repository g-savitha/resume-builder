// engine: the page-box model. Pure pagination over measured blocks; no DOM, React or theme.
// Imported by render/ (and tests) only.
export { layoutDocument, DEFAULT_RULES } from './layout';
export { pageSize } from './pageSize';
export {
  px,
  type AtomRange,
  type BreakRules,
  type FlowBlock,
  type Fragment,
  type LayoutInput,
  type Measured,
  type MeasuredAtom,
  type Measurer,
  type PageBox,
  type PagedLayout,
  type PageName,
  type PageSize,
  type Px,
  type RegionBox,
  type RegionId,
} from './types';
