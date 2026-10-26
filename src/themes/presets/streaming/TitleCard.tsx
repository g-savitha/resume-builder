import { ContactList, Heading, OnSurface, Text, type BespokeIdentityProps } from '@/primitives';
import styles from './streaming.module.css';

/** The name as a title card on the brand fill: an eyebrow, a big heavy name, the headline as the logline. */
export function TitleCard({ identity }: BespokeIdentityProps) {
  return (
    <OnSurface surface="accent">
      <div className={styles.card}>
        <p className={styles.eyebrow}>
          <Text tone="text">Featured profile</Text>
        </p>
        <div className={styles.title}>
          <Heading>{identity.name}</Heading>
        </div>
        {identity.headline ? (
          <p className={styles.logline}>
            <Text tone="text">{identity.headline}</Text>
          </p>
        ) : null}
        <ContactList contacts={identity.contacts} />
      </div>
    </OnSurface>
  );
}
