import { useAnnouncement } from '@/store';

/**
 * The editor's single polite live region. Reorders, additions, deletions and saves are announced here.
 * Re-keying the text node makes screen readers repeat identical messages ("Moved … position 2 of 5").
 */
export function LiveRegion() {
  const { seq, text } = useAnnouncement();
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="live-region">
      <span key={seq}>{text}</span>
    </div>
  );
}
