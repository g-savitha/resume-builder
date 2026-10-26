import { Decor, formatDateRange, Heading, Text, type BespokeEntryHeadProps } from '@/primitives';
import styles from './streaming.module.css';

/** An entry header as an episode: a big decorative number, the title, and "company · place · dates". */
export function EpisodeHead({ entry, index }: BespokeEntryHeadProps) {
  const meta = [entry.subtitle, entry.place, entry.dates ? formatDateRange(entry.dates) : ''].filter(Boolean).join(' · ');
  return (
    <div className={styles.episode}>
      <Decor>
        <span className={styles.number}>{String(index + 1)}</span>
      </Decor>
      <div>
        <Heading>{entry.title}</Heading>
        {meta ? (
          <p>
            <Text tone="muted">{meta}</Text>
          </p>
        ) : null}
      </div>
    </div>
  );
}
