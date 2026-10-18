import { useState } from 'react';

/**
 * Local text for an input whose stored value is structured (rich text, tags, dates).
 * The user's exact keystrokes stay in the draft; the parsed value goes to the store. When the stored value
 * changes from elsewhere (another field, a reload), the draft is re-derived from it.
 */
export function useDraft<T>(stored: T, format: (v: T) => string, sameValue: (draft: string, stored: T) => boolean) {
  const [draft, setDraft] = useState(() => format(stored));
  const [lastStored, setLastStored] = useState(stored);
  if (lastStored !== stored) {
    setLastStored(stored);
    if (!sameValue(draft, stored)) setDraft(format(stored));
  }
  return [draft, setDraft] as const;
}
