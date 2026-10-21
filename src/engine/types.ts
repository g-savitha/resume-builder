// The page-box model (docs/design/types.ts, module: engine). Pure data; no DOM, no React, no theme.
import type { Brand } from '@/domain';

/** CSS pixels (96 per inch). Branded so a millimetre or a point can't be passed where a pixel is meant. */
export type Px = Brand<number, 'Px'>;
export const px = (n: number): Px => n as Px;

/**
 * One unit of flow: a section (or, later, a band of sections). The engine only needs its identity and a hash of
 * what it renders; what it looks like stays with the caller (render), which extends this type.
 */
export interface FlowBlock {
  /** Unique in a layout: the section id. */
  readonly key: string;
  /** Changes whenever the block's rendered content does. With the style hash and width it keys the measure cache. */
  readonly contentHash: string;
}

export interface MeasuredAtom {
  readonly h: Px;
  /** Never end a page right after this atom (an entry's title line before its first bullet). */
  readonly keepWithNext: boolean;
}

/** A block's geometry at one width: its breakable units (atoms) plus the chrome around them. */
export interface Measured {
  readonly atoms: readonly MeasuredAtom[];
  /** Above the first atom (section heading, padding). Drawn only on the block's first fragment. */
  readonly chromeTop: Px;
  /** Below the last atom (padding, border). Drawn only on the block's last fragment. */
  readonly chromeBottom: Px;
  /** Space before the next block on the same page. Never carried onto the next page. */
  readonly gapAfter: Px;
  /** Move the whole block to the next page rather than split it (unless it is taller than a page). */
  readonly keepTogether: boolean;
}

/** Measures a block at a content width. The DOM measurer lives in render/; tests use a fake. */
export interface Measurer<B extends FlowBlock = FlowBlock> {
  measure(block: B, width: Px): Measured;
}

export type PageName = 'A4' | 'Letter';
export interface PageSize {
  readonly name: PageName;
  readonly w: Px;
  readonly h: Px;
  readonly marginPx: Px;
}

/**
 * Minimum atoms a split leaves on each side: `orphans` at the bottom of the page, `widows` at the top of the next.
 * Relaxed only when a block cannot be placed otherwise (see layoutDocument).
 */
export interface BreakRules {
  readonly orphans: number;
  readonly widows: number;
}

export interface LayoutInput<B extends FlowBlock> {
  /** In reading order. */
  readonly blocks: readonly B[];
  readonly size: PageSize;
  /** Everything outside the blocks that affects geometry (fonts, scale, spacing). */
  readonly styleHash: string;
  readonly rules?: Partial<BreakRules>;
}

export interface AtomRange {
  readonly from: number;
  readonly to: number;
  /** The block started on an earlier page (from > 0), so this fragment has no top chrome. */
  readonly continued: boolean;
}

/** The part of one block on one page. `y` is from the top of the region's content box. */
export interface Fragment {
  readonly key: string;
  readonly range: AtomRange;
  readonly y: Px;
  readonly h: Px;
}

/** Milestone 3 archetypes are single-column. `header` and `side` regions arrive with multi-region layouts (M5). */
export type RegionId = 'main';
export interface RegionBox {
  readonly id: RegionId;
  readonly width: Px;
  readonly height: Px;
  readonly fragments: readonly Fragment[];
}

/** A page's number is its index in `PagedLayout.pages`, so a page can be reused when pages before it change. */
export interface PageBox {
  readonly regions: readonly RegionBox[];
  /** A single atom taller than the page was placed here and is clipped. */
  readonly overflow: boolean;
}

export interface PagedLayout<B extends FlowBlock = FlowBlock> {
  readonly size: PageSize;
  readonly styleHash: string;
  readonly rules: BreakRules;
  /** Always at least one (an empty resume is one empty page). */
  readonly pages: readonly PageBox[];
  readonly blocks: ReadonlyMap<string, B>;
  /** `${key}@${contentHash}` in flow order. */
  readonly inputKeys: readonly string[];
}
