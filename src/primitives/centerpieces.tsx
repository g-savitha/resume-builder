import { Decor } from './Decor';
import { Text } from './text';
import styles from './primitives.module.css';

/** What the score dial shows: the candidate's own strongest metric, picked from their content (never from AI). */
export interface ScoreDialData {
  /** 1–100: the percentage drawn on the ring. */
  readonly value: number;
  /** The candidate's own words around the number, shortened. */
  readonly caption: string;
}

/** Centerpieces a persona may choose (a fixed registry: docs/design/rationale.md, AI persona addendum). */
export type CenterpieceData = { readonly kind: 'score-dial'; readonly dial: ScoreDialData };

const R = 15.9155; // circumference 100, so the dash length is the percentage

/**
 * A ring filled to the metric, with the number and caption as real text beside it (the ring itself is decor).
 * The arc is the surface's `icon` color (AA-ui against it); the track is the same color, faded (decor only).
 */
export function ScoreDial({ dial }: { readonly dial: ScoreDialData }) {
  const value = Math.max(1, Math.min(100, Math.round(dial.value)));
  return (
    <div className={styles.dial} data-centerpiece="score-dial">
      <Decor>
        <svg viewBox="0 0 36 36" width="40" height="40" className={styles.dialRing} focusable="false">
          <circle cx="18" cy="18" r={R} fill="none" stroke="var(--fg-icon)" strokeOpacity="0.25" strokeWidth="3.2" />
          <circle cx="18" cy="18" r={R} fill="none" stroke="var(--fg-icon)" strokeWidth="3.2" strokeDasharray={`${String(value)} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
        </svg>
      </Decor>
      <p className={styles.dialText}>
        <strong className={styles.dialValue}>{value}%</strong>
        <Text tone="muted">{dial.caption}</Text>
      </p>
    </div>
  );
}

/** Draws one registry centerpiece. A new kind is a union member above plus its component here. */
export function Centerpiece({ piece }: { readonly piece: CenterpieceData }) {
  return <ScoreDial dial={piece.dial} />;
}
