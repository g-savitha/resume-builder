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
  type PageSize,
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

const inputKey = (b: FlowBlock) => `${b.key}@${b.contentHash}`;
const sameGeometry = (a: PagedLayout, size: PageSize, styleHash: string, rules: BreakRules) =>
  a.styleHash === styleHash &&
  a.size.name === size.name &&
  a.size.w === size.w &&
  a.size.h === size.h &&
  a.size.marginPx === size.marginPx &&
  a.rules.orphans === rules.orphans &&
  a.rules.widows === rules.widows;

/** Where a page starts: block index and first atom. Pagination from a page start depends only on the blocks from there on. */
interface Cursor {
  readonly block: number;
  readonly atom: number;
}

/**
 * What can be kept from the previous layout (graft G2).
 * - `pages`: the previous pages before the first page that can change, reused by identity.
 * - `start`: where re-pagination begins (the start of that page).
 * - `tailAt(cursor)`: the previous pages from a page that starts at `cursor`, if everything from there on is
 *   unchanged, so the rest of the old layout can be appended by identity.
 */
interface Reuse {
  readonly pages: readonly PageBox[];
  readonly start: Cursor;
  tailAt(cursor: Cursor, blocks: readonly FlowBlock[]): readonly PageBox[] | null;
}

const firstFragment = (page: PageBox): Fragment | undefined => page.regions[0]?.fragments[0];

const NO_REUSE: Reuse = { pages: [], start: { block: 0, atom: 0 }, tailAt: () => null };

function planReuse(prev: PagedLayout, keys: readonly string[]): Reuse {
  const old = prev.inputKeys;
  const oldBlockKeys = [...prev.blocks.keys()]; // insertion order = flow order
  let firstDirty = 0;
  while (firstDirty < keys.length && firstDirty < old.length && keys[firstDirty] === old[firstDirty]) firstDirty++;
  if (firstDirty === 0) return NO_REUSE;

  // Restart at the page holding the end of the last unchanged block: a shorter edited block may move up onto it.
  // That page starts inside the unchanged prefix, so its start is valid in the new input at the same index.
  const lastClean = oldBlockKeys[firstDirty - 1];
  const restart = prev.pages.findLastIndex((p) => p.regions.some((r) => r.fragments.some((f) => f.key === lastClean)));
  const restartPage = prev.pages[restart];
  const head = restartPage && firstFragment(restartPage);
  if (!head) return NO_REUSE;
  const start: Cursor = { block: oldBlockKeys.indexOf(head.key), atom: head.range.from };

  // Blocks in the common suffix of old and new input are unchanged, and so is everything after them.
  let suffix = 0;
  while (suffix < keys.length && suffix < old.length && keys[keys.length - 1 - suffix] === old[old.length - 1 - suffix]) suffix++;
  const pageStarts = new Map<string, number>();
  prev.pages.forEach((page, j) => {
    const f = firstFragment(page);
    if (f && j > restart) pageStarts.set(`${f.key}:${String(f.range.from)}`, j);
  });

  return {
    pages: prev.pages.slice(0, restart),
    start,
    tailAt(cursor, blocks) {
      if (cursor.block < keys.length - suffix) return null;
      const block = blocks[cursor.block];
      const j = block ? pageStarts.get(`${block.key}:${String(cursor.atom)}`) : undefined;
      return j === undefined ? null : prev.pages.slice(j);
    },
  };
}

/**
 * Flows blocks onto fixed-size pages. Pure and deterministic: the same input and the same measurements give an
 * equal layout, with or without `prev`.
 *
 * With `prev` (the layout before an edit) it is incremental (graft G2): pages before the first changed block are
 * reused by identity, pagination restarts at the page where that block can begin, and it stops as soon as a new
 * page starts at the same (block, atom) as an old one with nothing changed after it; the old tail is then reused
 * by identity. A change of page size, style hash or break rules lays out from scratch. Only blocks on re-laid
 * pages are measured, plus the first block after them (to learn that it starts a new page).
 */
export function layoutDocument<B extends FlowBlock>(
  input: LayoutInput<B>,
  measurer: Measurer<B>,
  prev?: PagedLayout<B>,
): PagedLayout<B> {
  const { size, styleHash } = input;
  const rules: BreakRules = { ...DEFAULT_RULES, ...input.rules };
  const width = px(size.w - 2 * size.marginPx);
  const height = px(size.h - 2 * size.marginPx);

  const blocks = new Map<string, B>();
  for (const block of input.blocks) {
    if (blocks.has(block.key)) throw new Error(`Duplicate flow block key: ${block.key}`);
    blocks.set(block.key, block);
  }
  const inputKeys = input.blocks.map(inputKey);
  const result = (pages: readonly PageBox[]): PagedLayout<B> => ({ size, styleHash, rules, pages, blocks, inputKeys });

  const reuse = prev && sameGeometry(prev, size, styleHash, rules) ? planReuse(prev, inputKeys) : null;
  if (prev && reuse && inputKeys.length === prev.inputKeys.length && inputKeys.every((k, i) => k === prev.inputKeys[i])) {
    return result(prev.pages);
  }

  const pages: PageBox[] = [...(reuse?.pages ?? [])];
  let fragments: Fragment[] = [];
  let y = 0;
  let overflow = false;
  const closePage = () => {
    pages.push({ regions: [{ id: 'main', width, height, fragments }], overflow });
    fragments = [];
    y = 0;
    overflow = false;
  };

  const start = reuse?.start ?? { block: 0, atom: 0 };
  for (let b = start.block; b < input.blocks.length; b++) {
    const block = input.blocks[b];
    if (!block) continue;
    const m = measurer.measure(block, width);
    const n = m.atoms.length;
    let from = b === start.block ? start.atom : 0;
    for (;;) {
      const avail = height - y;
      const to = chooseEnd(m, from, avail, fragments.length === 0, rules);
      if (to === null) {
        closePage();
        const tail = reuse?.tailAt({ block: b, atom: from }, input.blocks);
        if (tail) return result([...pages, ...tail]);
        continue;
      }
      const h = fragmentHeight(m, from, to);
      if (h > avail) overflow = true;
      fragments.push({ key: block.key, range: { from, to, continued: from > 0 }, y: px(y), h: px(h) });
      y += h;
      if (to === n) break;
      from = to;
      closePage();
      const tail = reuse?.tailAt({ block: b, atom: from }, input.blocks);
      if (tail) return result([...pages, ...tail]);
    }
    y += m.gapAfter;
  }
  if (fragments.length > 0 || pages.length === 0) closePage();
  return result(pages);
}
