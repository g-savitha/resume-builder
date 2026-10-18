import { useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/icons';
import { focusSoon } from '../a11y/focus';

/** Two-step delete: the first press asks, the second deletes. Escape or Cancel backs out. (Undo arrives later.) */
export function ConfirmDelete({ what, onConfirm, compact = false }: { readonly what: string; readonly onConfirm: () => void; readonly compact?: boolean }) {
  const [asking, setAsking] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  if (!asking) {
    return (
      <button
        ref={triggerRef}
        type="button"
        className={compact ? 'icon-btn danger' : 'btn btn-ghost btn-sm danger'}
        aria-label={`Delete ${what}`}
        title={`Delete ${what}`}
        onClick={() => {
          setAsking(true);
          requestAnimationFrame(() => cancelRef.current?.focus());
        }}
      >
        <Icon name="trash" />
        {compact ? null : <span>Delete</span>}
      </button>
    );
  }
  const back = () => {
    setAsking(false);
    focusSoon(`[aria-label="Delete ${what.replace(/"/g, '\\"')}"]`);
  };
  const onEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') back();
  };
  return (
    <span
      className="confirm"
      role="group"
      aria-label={`Confirm deleting ${what}`}
    >
      <span className="confirm-q">Delete?</span>
      <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm} onKeyDown={onEscape}>
        Delete {compact ? '' : what}
      </button>
      <button ref={cancelRef} type="button" className="btn btn-ghost btn-sm" onClick={back} onKeyDown={onEscape}>
        Cancel
      </button>
    </span>
  );
}
