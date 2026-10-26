import { describe, expect, it } from 'vitest';
import { contentBox, pageSize, px, type PageBox } from '@/engine';
import { ARCHETYPES } from '@/themes';
import { COLUMN_GUTTER, createPageZipper, pageFrame } from './regions';

const size = pageSize('A4', 15);

describe('pageFrame', () => {
  it('gives single-column themes one full-width main region and no band', () => {
    const f = pageFrame(ARCHETYPES.classic.layout, size);
    expect(f.regions.map((r) => [r.id, r.x, r.width])).toEqual([['main', 0, contentBox(size).w]]);
    expect(f.band).toBeUndefined();
  });

  it('splits the content box into side + gutter + main, and sizes each column’s page for the engine', () => {
    for (const id of ['sidebar', 'app-ui'] as const) {
      const f = pageFrame(ARCHETYPES[id].layout, size);
      const [main, side] = f.regions;
      expect(main && side && main.width + side.width + COLUMN_GUTTER).toBeCloseTo(contentBox(size).w);
      expect(main && contentBox(main.size).w).toBe(main?.width);
      expect(side && contentBox(side.size).h).toBe(contentBox(size).h);
      expect(f.band?.side).toBe(id === 'sidebar' ? 'left' : 'right');
    }
  });
});

describe('createPageZipper', () => {
  const frame = pageFrame(ARCHETYPES.sidebar.layout, size);
  const page = (id: 'main' | 'side', key: string): PageBox => ({ regions: [{ id, width: px(100), height: px(100), fragments: [{ key, range: { from: 0, to: 1, continued: false }, y: px(0), h: px(10) }] }], overflow: false });

  it('zips columns into the longer one’s page count, padding the shorter with an empty column', () => {
    const zip = createPageZipper();
    const pages = zip(frame.regions, [[page('main', 'a'), page('main', 'b')], [page('side', 's')]]);
    expect(pages).toHaveLength(2);
    expect(pages[1]?.regions.map((r) => [r.id, r.fragments.length])).toEqual([['main', 1], ['side', 0]]);
  });

  it('keeps a sheet’s identity while its column pages are unchanged (so its PageView skips re-rendering)', () => {
    const zip = createPageZipper();
    const main = [page('main', 'a')];
    const side = [page('side', 's')];
    expect(zip(frame.regions, [main, side])[0]).toBe(zip(frame.regions, [main, side])[0]);
    expect(zip(frame.regions, [main, [page('side', 't')]])[0]).not.toBe(zip(frame.regions, [main, side])[0]);
  });
});
