import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { newId, type ItemId, type SectionId, type SectionKind } from '@/domain';
import { Icon } from '@/icons';
import { sectionRegistry } from '@/sections';
import { useAnnounce, useDispatch } from '@/store';
import { focusSoon } from '../a11y/focus';
import { useEditorScope } from '../context';
import { useActiveResumeDocument } from './useActiveDocument';

/** Disclosure listing every registered section kind (single-instance kinds already present are omitted). */
export function AddSectionMenu({ onAdded }: { readonly onAdded: (id: SectionId) => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resumeId } = useEditorScope();
  const getDoc = useActiveResumeDocument();
  const dispatch = useDispatch();
  const announce = useAnnounce();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (e.target instanceof Node && !containerRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const doc = open ? getDoc() : undefined;
  const present = new Set(doc ? Object.values(doc.sections).map((s) => s.kind) : []);
  const choices = [...sectionRegistry]
    .filter(([kind, def]) => def.cardinality === 'many' || !present.has(kind))
    .sort(([, a], [, b]) => a.defaultLabel.localeCompare(b.defaultLabel));

  const add = (kind: SectionKind) => {
    const def = sectionRegistry.get(kind);
    const current = getDoc();
    if (!def || !current) return;
    const sectionId = newId<SectionId>();
    dispatch(resumeId, {
      type: 'section/create',
      sectionId,
      kind,
      atIndex: current.sectionOrder.length,
      ...(kind === 'custom' ? { custom: { shape: 'entries' } } : {}),
    });
    dispatch(resumeId, { type: 'item/create', sectionId, itemId: newId<ItemId>(), atIndex: 0 });
    setOpen(false);
    onAdded(sectionId);
    announce(`Added ${def.defaultLabel} section at the end.`);
    focusSoon('#section-editor [data-autofocus]', '#section-editor h2');
  };

  const onEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className="menu-wrap" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className="link-btn"
        aria-expanded={open}
        aria-controls={menuId}
        onKeyDown={onEscape}
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        <Icon name="plus" /> Add section
      </button>
      {open ? (
        <ul id={menuId} className="menu" aria-label="Section types">
          {choices.map(([kind, def]) => (
            <li key={kind}>
              <button
                type="button"
                className="menu-item"
                onKeyDown={onEscape}
                onClick={() => {
                  add(kind);
                }}
              >
                {def.defaultIcon ? <Icon name={def.defaultIcon} /> : null}
                {def.defaultLabel}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
