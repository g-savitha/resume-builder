import { createContext, useContext, type ReactNode } from 'react';
import styles from './primitives.module.css';

type Level = 1 | 2 | 3;
const LevelContext = createContext<Level>(2);

/**
 * Sets the heading level for the Headings inside. Internal to primitives: the block kit assigns levels
 * (identity name h1, section h2, entry h3), so a block can never pick its own.
 */
export function HeadingLevel({ level, children }: { readonly level: Level; readonly children: ReactNode }) {
  return <LevelContext value={level}>{children}</LevelContext>;
}

/** No `level` prop: the level comes from where the heading sits. */
export function Heading({ children }: { readonly children: ReactNode }) {
  const level = useContext(LevelContext);
  const Tag = `h${String(level)}` as 'h1' | 'h2' | 'h3';
  return <Tag className={styles[`h${String(level)}`]}>{children}</Tag>;
}

export type Tone = 'text' | 'muted' | 'accentText';
export function Text({ children, tone = 'text' }: { readonly children: ReactNode; readonly tone?: Tone }) {
  return <span className={styles[tone]}>{children}</span>;
}
