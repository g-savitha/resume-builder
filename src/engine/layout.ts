import {
  px,
  type BreakRules,
  type FlowBlock,
  type Fragment,
  type LayoutInput,
  type Measured,
  type Measurer,
  type PageBox,
  type PagedLayout,
} from './types';

export const DEFAULT_RULES: BreakRules = { orphans: 1, widows: 1 };

/** Height of atoms [from, to) of a block, with its top chrome on the first fragment and bottom chrome on the last. */
function fragmentHeight(m: Measured, from: number, to: number): number {
  let h = from === 0 ? m.chromeTop : 0;
  for (let i = from; i < to; i++) h += m.atoms[i]?.h ?? 0;
  return to === m.atoms.length ? h + m.chromeBottom : h;
}

/**
 * How strictly a break is chosen. A block is tried strictly first; only on an empty page, where moving on would not
 * help, are the rules relaxed in this order, so a resume always lays out.
 */
type Strictness = 'strict' | 'no-keep-rules' | 'any-atom';

/** Ends `to` (exclusive) the fragment starting at `from` may have, smallest first. */
function allowedEnds(m: Measured, from: number, rules: BreakRules, strictness: Strictness): number[] {
  const n = m.atoms.length;
  const ends: number[] = [];
  for (let to = from + 1; to < n; to++) {
    if (strictness !== 'any-atom' && m.atoms[to - 1]?.keepWithNext) continue;
    if (strictness === 'strict' && (m.keepTogether || to - from < rules.orphans || n - to < rules.widows)) continue;
    ends.push(to);
  }
  ends.push(n); // finishing the block is always allowed (n === from only for a block without atoms)
  return ends;
}

/** The longest allowed fragment that fits in `avail`, or null when none does. */
function fittingEnd(m: Measured, from: number, avail: number, rules: BreakRules, strictness: Strictness): number | null {
  const ends = allowedEnds(m, from, rules, strictness);
  for (let i = ends.length - 1; i >= 0; i--) {
    const to = ends[i];
    if (to !== undefined && fragmentHeight(m, from, to) <= avail) return to;
  }
  return null;
}

/**
 * Where the fragment starting at `from` ends. null = it does not fit on this page; start a new one.
 * On an empty page something is always placed: strict rules, then without keep-together / keep-with-next /
 * orphans / widows, then a single atom (which overflows the page if it is taller than it).
 */
function chooseEnd(m: Measured, from: number, avail: number, pageEmpty: boolean, rules: BreakRules): number | null {
  const strict = fittingEnd(m, from, avail, rules, 'strict');
  if (strict !== null || !pageEmpty) return strict;
  return (
    fittingEnd(m, from, avail, rules, 'no-keep-rules') ??
    fittingEnd(m, from, avail, rules, 'any-atom') ??
    Math.min(from + 1, m.atoms.length)
  );
}

/**
 * Flows blocks onto fixed-size pages. Pure and deterministic: the same input and the same measurements give an
 * equal layout. Each block is measured once, at the content width.
 */
export function layoutDocument<B extends FlowBlock>(input: LayoutInput<B>, measurer: Measurer<B>): PagedLayout<B> {
  const { size, styleHash } = input;
  const rules: BreakRules = { ...DEFAULT_RULES, ...input.rules };
  const width = px(size.w - 2 * size.marginPx);
  const height = px(size.h - 2 * size.marginPx);

  const blocks = new Map<string, B>();
  for (const block of input.blocks) {
    if (blocks.has(block.key)) throw new Error(`Duplicate flow block key: ${block.key}`);
    blocks.set(block.key, block);
  }

  const pages: PageBox[] = [];
  let fragments: Fragment[] = [];
  let y = 0;
  let overflow = false;
  const closePage = () => {
    pages.push({ regions: [{ id: 'main', width, height, fragments }], overflow });
    fragments = [];
    y = 0;
    overflow = false;
  };

  for (const block of input.blocks) {
    const m = measurer.measure(block, width);
    const n = m.atoms.length;
    let from = 0;
    for (;;) {
      const avail = height - y;
      const to = chooseEnd(m, from, avail, fragments.length === 0, rules);
      if (to === null) {
        closePage();
        continue;
      }
      const h = fragmentHeight(m, from, to);
      if (h > avail) overflow = true;
      fragments.push({ key: block.key, range: { from, to, continued: from > 0 }, y: px(y), h: px(h) });
      y += h;
      if (to === n) break;
      from = to;
      closePage();
    }
    y += m.gapAfter;
  }
  if (fragments.length > 0 || pages.length === 0) closePage();

  return { size, styleHash, rules, pages, blocks, inputKeys: input.blocks.map((b) => `${b.key}@${b.contentHash}`) };
}
