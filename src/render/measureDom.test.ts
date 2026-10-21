import { describe, expect, it } from 'vitest';
import { measureBlock } from './measureDom';

/** Gives an element a fixed box; jsdom has no layout. */
function box(el: Element, top: number, height: number) {
  el.getBoundingClientRect = () => ({ top, bottom: top + height, height, left: 0, right: 100, width: 100, x: 0, y: top, toJSON: () => ({}) });
}

function section(html: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild as HTMLElement;
}

describe('measureBlock', () => {
  it('reads atom heights as top-to-next-top, chrome above the first and below the last, and the keep flags', () => {
    const el = section(`<section data-block="exp">
      <h2>Experience</h2>
      <p data-atom="0" data-keep-with-next></p><ul><li data-atom="1"></li><li data-atom="2"></li></ul>
    </section>`);
    box(el, 100, 130); // 100 → 230
    const [a0, a1, a2] = Array.from(el.querySelectorAll('[data-atom]'));
    box(a0!, 120, 18); // heading chrome 20 above
    box(a1!, 140, 16); // 2px between a0 and a1 belongs to a0
    box(a2!, 160, 60); // ends at 220: 10 of chrome below
    const cont = section('<section data-block="exp"><h2>Experience (continued)</h2></section>');
    box(cont, 0, 24);
    const m = measureBlock(el, cont, 16);
    expect(m.atoms).toEqual([
      { h: 20, keepWithNext: true },
      { h: 20, keepWithNext: false },
      { h: 60, keepWithNext: false },
    ]);
    expect([m.chromeTop, m.chromeTopContinued, m.chromeBottom, m.gapAfter, m.keepTogether]).toEqual([20, 24, 10, 16, false]);
    // The parts add back up to the block: nothing is lost or counted twice.
    expect(m.chromeTop + m.atoms.reduce((s, a) => s + a.h, 0) + m.chromeBottom).toBe(130);
  });

  it('keeps an identity block together and gives it no continued chrome', () => {
    const el = section('<section data-block="id" data-keep-together><h1 data-atom="0"></h1></section>');
    box(el, 0, 80);
    box(el.querySelector('[data-atom]')!, 0, 80);
    const m = measureBlock(el, null, 0);
    expect(m.keepTogether).toBe(true);
    expect(m.chromeTopContinued).toBe(0);
    expect(m.atoms).toEqual([{ h: 80, keepWithNext: false }]);
  });

  it('treats a block with no atoms as all top chrome', () => {
    const el = section('<section data-block="x"><h2>Empty</h2></section>');
    box(el, 50, 30);
    expect(measureBlock(el, null, 0)).toMatchObject({ atoms: [], chromeTop: 30, chromeBottom: 0 });
  });
});
