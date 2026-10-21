import { px, type PageName, type PageSize } from './types';

const PX_PER_MM = 96 / 25.4;
/** ISO 216 A4 and US Letter, in millimetres. */
const PAGE_MM: Readonly<Record<PageName, { readonly w: number; readonly h: number }>> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
};

/** Page box in CSS pixels at 96 dpi, the unit print and screen layout share. */
export function pageSize(name: PageName, marginsMm: number): PageSize {
  const mm = PAGE_MM[name];
  return { name, w: px(mm.w * PX_PER_MM), h: px(mm.h * PX_PER_MM), marginPx: px(marginsMm * PX_PER_MM) };
}
