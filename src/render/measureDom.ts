import { px, type Measured, type MeasuredAtom } from '@/engine';

/**
 * Reads a block's geometry from its rendered DOM: a BlockView drawn whole (`full`) and, for sections, the same
 * block's continued frame drawn with no atoms (`continued`, its "(continued)" heading).
 *
 * An atom's height is the distance from its top to the next atom's top, so whatever sits between two atoms is
 * counted once; the last atom runs to its own bottom, and the rest of the block below it is chrome. That holds
 * because primitives have no outer margins (nothing collapses across a page break).
 */
export function measureBlock(full: HTMLElement, continued: HTMLElement | null, gapAfterPx: number): Measured {
  const box = full.getBoundingClientRect();
  const atomEls = Array.from(full.querySelectorAll<HTMLElement>('[data-atom]'));
  const rects = atomEls.map((el) => el.getBoundingClientRect());
  const atoms: MeasuredAtom[] = atomEls.map((el, i) => {
    const r = rects[i];
    const next = rects[i + 1];
    const h = !r ? 0 : next ? next.top - r.top : r.bottom - r.top;
    return { h: px(Math.max(0, h)), keepWithNext: el.hasAttribute('data-keep-with-next') };
  });
  const first = rects[0];
  const last = rects[rects.length - 1];
  return {
    atoms,
    chromeTop: px(first ? first.top - box.top : box.height),
    chromeTopContinued: px(continued ? continued.getBoundingClientRect().height : 0),
    chromeBottom: px(last ? Math.max(0, box.bottom - last.bottom) : 0),
    gapAfter: px(gapAfterPx),
    keepTogether: full.hasAttribute('data-keep-together'),
  };
}
