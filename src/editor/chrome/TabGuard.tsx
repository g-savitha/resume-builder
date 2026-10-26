import { useEffect, useId, useRef } from 'react';
import { useTabState } from '@/store';
import { useEditorPorts } from '../ports';

/**
 * Shown when another tab holds the editor lock: editing here could overwrite that tab's work, so the page behind
 * is inert until the user takes over (which reloads with the latest saved resume).
 */
export function TabGuard() {
  const tab = useTabState();
  const { takeOver } = useEditorPorts();
  const titleId = useId();
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (tab === 'elsewhere') button.current?.focus();
  }, [tab]);
  if (tab !== 'elsewhere') return null;
  return (
    <div className="tab-guard" data-testid="tab-guard">
      <div className="tab-guard-card" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>Your resume is open in another tab</h2>
        <p>To keep your changes safe, edit in one tab at a time.</p>
        <button ref={button} type="button" className="btn btn-primary" onClick={takeOver}>
          Use this tab instead
        </button>
      </div>
    </div>
  );
}
