import type { SurfaceName } from '@/domain';
import { contentBox, px, type PageBox, type PageSize, type Px, type RegionBox, type RegionId } from '@/engine';
import type { LayoutSpec } from '@/themes';

/** Space between the main and side columns, in CSS px (about 5 mm). */
export const COLUMN_GUTTER = 20;

/** One column of the page: where it sits inside the content box and which surface its blocks draw on. */
export interface RegionFrame {
  readonly id: RegionId;
  /** Left edge, relative to the content box. */
  readonly x: number;
  readonly width: Px;
  readonly surface: SurfaceName;
  /** The page size the engine paginates this column with: the column width plus the page margins. */
  readonly size: PageSize;
}

/** A side column's full-height fill, measured from the sheet's edge. */
export interface Band {
  readonly side: 'left' | 'right';
  readonly width: number;
  readonly surface: SurfaceName;
}

export interface PageFrame {
  readonly regions: readonly RegionFrame[];
  readonly band?: Band;
}

const sized = (size: PageSize, width: Px): PageSize => ({ ...size, w: px(width + 2 * size.marginPx) });

/** The columns of every page for a theme's layout. Single-column themes get one `main` region the full width. */
export function pageFrame(layout: LayoutSpec, size: PageSize): PageFrame {
  const w = contentBox(size).w;
  if (layout.kind === 'single') return { regions: [{ id: 'main', x: 0, width: w, surface: 'page', size }] };
  const sideW = px(Math.round(w * layout.sideFraction));
  const mainW = px(w - sideW - COLUMN_GUTTER);
  const left = layout.side === 'left';
  const main: RegionFrame = { id: 'main', x: left ? sideW + COLUMN_GUTTER : 0, width: mainW, surface: 'page', size: sized(size, mainW) };
  const side: RegionFrame = { id: 'side', x: left ? 0 : mainW + COLUMN_GUTTER, width: sideW, surface: layout.sideSurface, size: sized(size, sideW) };
  return {
    regions: [main, side],
    band: { side: layout.side, width: size.marginPx + sideW + COLUMN_GUTTER / 2, surface: layout.sideSurface },
  };
}

const emptyRegion = (frame: RegionFrame): RegionBox => ({ id: frame.id, width: frame.width, height: contentBox(frame.size).h, fragments: [] });

/**
 * Zips per-column pages into sheets: page i holds every column's page i (an empty column when one runs out first).
 * Memoized by the column pages' identity, so a sheet whose columns did not change keeps its PageBox and its
 * PageView skips re-rendering.
 */
export function createPageZipper() {
  const cache = new WeakMap<PageBox, Map<PageBox | null, PageBox>>();
  const empties = new Map<RegionId, PageBox>();
  return function zip(frames: readonly RegionFrame[], columns: readonly (readonly PageBox[])[]): readonly PageBox[] {
    if (columns.length === 1) return columns[0] ?? [];
    const n = Math.max(...columns.map((c) => c.length));
    const pages: PageBox[] = [];
    for (let i = 0; i < n; i++) {
      const parts = frames.map((f, k) => columns[k]?.[i] ?? emptyPage(f));
      const [a, b = null] = parts;
      if (!a) continue;
      let byB = cache.get(a);
      if (!byB) cache.set(a, (byB = new Map<PageBox | null, PageBox>()));
      let page = byB.get(b);
      if (!page) {
        page = { regions: parts.flatMap((p) => p.regions), overflow: parts.some((p) => p.overflow) };
        byB.set(b, page);
      }
      pages.push(page);
    }
    return pages;
  };
  function emptyPage(f: RegionFrame): PageBox {
    let page = empties.get(f.id);
    if (!page || page.regions[0]?.width !== f.width) empties.set(f.id, (page = { regions: [emptyRegion(f)], overflow: false }));
    return page;
  }
}
