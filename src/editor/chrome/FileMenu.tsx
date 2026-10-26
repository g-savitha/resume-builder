import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '@/icons';
import { useAnnounce, useResumeActions } from '@/store';
import { useEditorScope } from '../context';
import { useEditorPorts } from '../ports';
import { downloadText, duplicateOf, exportJsonResumeFile, exportNativeFile, importFile } from './files';

/**
 * File (M7): duplicate the resume, export it (our JSON with every variant, or JSON Resume with the content), and
 * import either format as a new resume. A disclosure, not an ARIA menu: plain buttons in tab order; Escape closes.
 */
export function FileMenu() {
  const { resumeId } = useEditorScope();
  const actions = useResumeActions();
  const ports = useEditorPorts();
  const announce = useAnnounce();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();
  const inputId = useId();
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggle.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    toggle.current?.focus();
  };
  const doc = () => actions.getDocument(resumeId);

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const outcome = await importFile(await file.text(), file.name, ports);
    if (!outcome.ok) {
      setError(outcome.message);
      announce(outcome.message);
      return;
    }
    setError(null);
    actions.addDocument(outcome.doc);
    announce(`Imported “${outcome.doc.name}” as a new resume. It is open now.`);
    close();
  };

  return (
    <div className="file-menu" ref={root}>
      <button
        ref={toggle}
        type="button"
        className="btn btn-ghost btn-sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        <Icon name="fileText" /> File
      </button>
      <div id={panelId} className="file-panel" hidden={!open} data-testid="file-menu">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const d = doc();
            if (!d) return;
            const copy = duplicateOf(d);
            actions.addDocument(copy);
            announce(`Duplicated as “${copy.name}”. The copy is open now.`);
            close();
          }}
        >
          Duplicate resume
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const d = doc();
            if (!d) return;
            const f = exportNativeFile(d);
            downloadText(f.filename, f.text);
            announce(`Exported ${f.filename}, with every variant.`);
            close();
          }}
        >
          Export JSON (all variants)
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const d = doc();
            if (!d) return;
            const f = exportJsonResumeFile(d);
            downloadText(f.filename, f.text);
            announce(`Exported ${f.filename} (JSON Resume, content only)${f.skipped.length ? `. Not included: ${f.skipped.join(', ')}` : ''}.`);
            close();
          }}
        >
          Export JSON Resume
        </button>
        <label htmlFor={inputId} className="btn btn-ghost btn-sm file-import">
          Import JSON…
        </label>
        <input id={inputId} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => void onImport(e)} />
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
