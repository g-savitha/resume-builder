import type { ReactNode } from 'react';
import type { Inline, RichText, TextRun } from '@/domain';
import { ALL_ATOMS, Atom, inRange, type AtomRange } from './Atom';
import styles from './primitives.module.css';

/** Atoms in a rich text: one per paragraph and one per bullet. */
export function richAtomCount(value: RichText): number {
  return value.reduce((n, block) => n + (block.t === 'p' ? 1 : block.items.length), 0);
}

export interface RichTextViewProps {
  readonly value: RichText;
  /** Index of this text's first atom within its block. */
  readonly base?: number;
  /** Render only the atoms in this range (block indices). */
  readonly range?: AtomRange;
  /** Keep the last atom with whatever follows it in the block (an entry's tag line). */
  readonly keepLastWithNext?: boolean;
}

type Numbered =
  | { readonly t: 'p'; readonly i: number; readonly children: readonly Inline[] }
  | { readonly t: 'ul'; readonly items: readonly { readonly i: number; readonly inlines: readonly Inline[] }[] };

/** Gives each paragraph and bullet its atom index within the block, in reading order. */
function numberAtoms(value: RichText, base: number): readonly Numbered[] {
  const out: Numbered[] = [];
  let i = base;
  for (const block of value) {
    if (block.t === 'p') out.push({ t: 'p', i: i++, children: block.children });
    else out.push({ t: 'ul', items: block.items.map((inlines) => ({ i: i++, inlines })) });
  }
  return out;
}

/** `<p>`, `<ul>/<li>`, `<strong>`, `<em>`, `<a href>`. Each paragraph and each bullet is an `<Atom>`. */
export function RichTextView({ value, base = 0, range = ALL_ATOMS, keepLastWithNext = false }: RichTextViewProps) {
  const last = base + richAtomCount(value) - 1;
  const keep = (i: number) => keepLastWithNext && i === last;
  return numberAtoms(value, base).map((block, b) => {
    if (block.t === 'p') {
      return inRange(block.i, range) ? (
        <Atom key={b} i={block.i} as="p" keepWithNext={keep(block.i)}>
          <Inlines xs={block.children} />
        </Atom>
      ) : null;
    }
    const shown = block.items.filter(({ i }) => inRange(i, range));
    return shown.length ? (
      <ul key={b} className={styles.list}>
        {shown.map(({ i, inlines }) => (
          <Atom key={i} i={i} as="li" keepWithNext={keep(i)}>
            <Inlines xs={inlines} />
          </Atom>
        ))}
      </ul>
    ) : null;
  });
}

function Run({ run }: { readonly run: TextRun }) {
  const marks = run.marks ?? [];
  let node: ReactNode = run.text;
  if (marks.includes('italic')) node = <em>{node}</em>;
  if (marks.includes('bold')) node = <strong>{node}</strong>;
  return node;
}

function Inlines({ xs }: { readonly xs: readonly Inline[] }) {
  return xs.map((x, i) =>
    x.t === 'link' ? (
      <a key={i} href={x.href} className={styles.link}>
        {x.children.map((c, j) => (
          <Run key={j} run={c} />
        ))}
      </a>
    ) : (
      <Run key={i} run={x} />
    ),
  );
}
