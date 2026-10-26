import { describe, expect, it } from 'vitest';
import { pageSize, px, type Measured } from '@/engine';
import type { RenderBlock } from './flow';
import { PreviewEngine } from './PreviewEngine';

const size = pageSize('A4', 15);
const W = px(size.w - 2 * size.marginPx);
const block = (key: string, hash = key): RenderBlock => ({ key, contentHash: hash, region: 'main', view: { shape: 'prose', style: 'plain', heading: key, content: [] } });
const tall = (atoms: number): Measured => ({
  atoms: Array.from({ length: atoms }, () => ({ h: px(100), keepWithNext: false })),
  chromeTop: px(20),
  chromeTopContinued: px(20),
  chromeBottom: px(0),
  gapAfter: px(10),
  keepTogether: false,
});

describe('PreviewEngine', () => {
  it('lays out only once every block is measured, and reports just the unmeasured ones', () => {
    const engine = new PreviewEngine();
    const blocks = [block('a'), block('b')];
    const input = { blocks, size, styleHash: 's' };
    expect(engine.missing(blocks, 's', W).map((b) => b.key)).toEqual(['a', 'b']);
    engine.record(blocks[0]!, 's', W, tall(3));
    expect(engine.layout(input)).toBeNull();
    expect(engine.missing(blocks, 's', W).map((b) => b.key)).toEqual(['b']);
    engine.record(blocks[1]!, 's', W, tall(12));
    const layout = engine.layout(input);
    expect(layout?.pages.length).toBe(2);
    expect(engine.layout(input)).toBe(layout); // same input, same object
  });

  it('re-measures a block only when its content, the style or the width changes', () => {
    const engine = new PreviewEngine();
    engine.record(block('a'), 's', W, tall(1));
    expect(engine.missing([block('a')], 's', W)).toEqual([]);
    expect(engine.missing([block('a', 'a2')], 's', W)).toHaveLength(1);
    expect(engine.missing([block('a')], 's2', W)).toHaveLength(1);
    expect(engine.missing([block('a')], 's', px(W - 1))).toHaveLength(1);
  });

  it('reuses unchanged pages from the previous layout when one block changes', () => {
    const engine = new PreviewEngine();
    const a = block('a');
    const b1 = block('b', 'b1');
    const b2 = block('b', 'b2');
    engine.record(a, 's', W, tall(20));
    engine.record(b1, 's', W, tall(2));
    engine.record(b2, 's', W, tall(3));
    const first = engine.layout({ blocks: [a, b1], size, styleHash: 's' });
    const second = engine.layout({ blocks: [a, b2], size, styleHash: 's' });
    expect(second?.pages[0]).toBe(first?.pages[0]);
    expect(second?.pages.at(-1)).not.toBe(first?.pages.at(-1));
  });
});
