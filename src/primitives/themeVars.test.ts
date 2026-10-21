import css from './primitives.module.css?raw';
import { THEME_VARS } from './themeVars';

describe('THEME_VARS', () => {
  it('lists exactly the --rs-* variables the block CSS reads, plus the section gap the measurer reads', () => {
    const read = new Set([...css.matchAll(/var\((--rs-[a-z0-9-]+)/g)].map((m) => m[1]));
    read.add('--rs-section-gap'); // read by render's measurer (gap between blocks), not by this CSS
    expect([...read].sort()).toEqual([...THEME_VARS].sort());
  });
});
