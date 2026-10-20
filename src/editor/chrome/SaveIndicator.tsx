import { useEffect, useRef } from 'react';
import { Icon } from '@/icons';
import { useAnnounce, useSaveState } from '@/store';

const ANNOUNCE_EVERY_MS = 30_000;

/**
 * Visible autosave status. Screen readers hear failures immediately and a "saved" confirmation at most
 * every 30 s, so typing is not interrupted by an announcement after every pause.
 * `data-component="save-status"` + `data-state` (idle | saving | saved | error) is the hook agents and tests wait on.
 */
export function SaveIndicator() {
  const save = useSaveState();
  const announce = useAnnounce();
  const lastAnnounced = useRef(0);
  useEffect(() => {
    if (save.kind === 'error') announce(`Could not save: ${save.message}. Your changes are kept in this tab.`);
    if (save.kind === 'saved' && save.at - lastAnnounced.current > ANNOUNCE_EVERY_MS) {
      lastAnnounced.current = save.at;
      announce('All changes saved in this browser.');
    }
  }, [save, announce]);

  switch (save.kind) {
    case 'saving':
      return (
        <span className="saved" data-component="save-status" data-state="saving">
          <Icon name="spinner" /> Saving…
        </span>
      );
    case 'error':
      return (
        <span className="saved error" data-component="save-status" data-state="error">
          <Icon name="alert" /> Not saved
        </span>
      );
    case 'idle':
    case 'saved':
      return (
        <span className="saved" data-component="save-status" data-state={save.kind}>
          <Icon name="check" /> Saved locally
        </span>
      );
    default: {
      const _exhaustive: never = save;
      return _exhaustive;
    }
  }
}
