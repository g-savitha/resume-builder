import type { ReactNode } from 'react';
import styles from './primitives.module.css';

/** A breakable unit: the engine may end a page after any atom (unless it keeps with the next one). */
export interface AtomRange {
  readonly from: number;
  readonly to: number;
  /** The block started on an earlier page: no heading on this fragment. */
  readonly continued: boolean;
}
/** Every atom of a block: used to measure it, and for blocks that fit on one page. */
export const ALL_ATOMS: AtomRange = { from: 0, to: Number.POSITIVE_INFINITY, continued: false };
export const inRange = (i: number, r: AtomRange) => i >= r.from && i < r.to;

export interface AtomProps {
  /** Index within the block, in reading order. */
  readonly i: number;
  readonly keepWithNext?: boolean;
  /** The element the atom is, so a bullet is the `li` itself and list semantics stay intact. */
  readonly as?: 'div' | 'li' | 'p' | 'header';
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

/**
 * Marks one breakable unit for the measurer (`data-atom`, `data-keep-with-next`). Atoms carry all vertical space
 * as padding, never margin, so an atom's height does not depend on what is next to it (see primitives.module.css).
 */
export function Atom({ i, keepWithNext = false, as: Tag = 'div', className, children }: AtomProps) {
  return (
    <Tag
      data-atom={i}
      {...(keepWithNext ? { 'data-keep-with-next': '' } : {})}
      className={className ? `${styles.atom} ${className}` : styles.atom}
    >
      {children}
    </Tag>
  );
}
