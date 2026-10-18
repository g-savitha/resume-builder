import { useCallback, useId, useState } from 'react';
import { newId, type ItemId, type SectionId } from '@/domain';
import { Icon } from '@/icons';
import { sectionDef, sectionLabel } from '@/sections';
import { useAnnounce, useDispatch, useSection } from '@/store';
import { focusSoon } from '../a11y/focus';
import { useEditorScope } from '../context';
import { FieldEditor } from '../fields/FieldEditor';
import { SortableList } from '../reorder/SortableList';
import { ConfirmDelete } from './ConfirmDelete';
import { ItemCard } from './ItemCard';
import { useItemLabels } from './useLabels';

/** The form for one section: its title, then its entries. Generated from the section's definition. */
export function SectionEditor({ sectionId, onDeleted }: { readonly sectionId: SectionId; readonly onDeleted: () => void }) {
  const section = useSection(sectionId);
  const { resumeId } = useEditorScope();
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const titleId = useId();
  const labelOf = useItemLabels(sectionId);
  const [expanded, setExpanded] = useState<ReadonlySet<ItemId>>(() => new Set(section?.itemOrder.slice(0, 1)));
  const onMove = useCallback(
    (itemId: ItemId, toIndex: number) => {
      dispatch(resumeId, { type: 'item/move', itemId, toSection: sectionId, toIndex });
    },
    [dispatch, resumeId, sectionId],
  );
  const def = section ? sectionDef(section.kind) : undefined;
  if (!section || !def) return null;
  const label = sectionLabel(section);
  const single = def.cardinality === 'single';
  const firstItem = section.itemOrder[0];

  const toggle = (id: ItemId) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addItem = () => {
    const itemId = newId<ItemId>();
    dispatch(resumeId, { type: 'item/create', sectionId, itemId, atIndex: section.itemOrder.length });
    setExpanded((prev) => new Set(prev).add(itemId));
    announce(`Added a new entry to ${label}.`);
    focusSoon(`[data-item-body="${itemId}"] input, [data-item-body="${itemId}"] textarea`);
  };

  return (
    <section className="card section-editor" id="section-editor" aria-labelledby={`${titleId}-h`}>
      <div className="card-head">
        <h2 id={`${titleId}-h`} tabIndex={-1}>
          {label}
          {!single ? <span className="count"> · {section.itemOrder.length} {section.itemOrder.length === 1 ? 'entry' : 'entries'}</span> : null}
        </h2>
        <ConfirmDelete
          what={`${label} section`}
          onConfirm={() => {
            dispatch(resumeId, { type: 'section/delete', sectionId });
            announce(`Deleted ${label} section.`);
            onDeleted();
          }}
        />
      </div>
      <div className="field">
        <label htmlFor={titleId}>Section title</label>
        <input
          id={titleId}
          className="input"
          data-autofocus
          value={section.title ?? ''}
          placeholder={def.defaultLabel}
          onChange={(e) => {
            const title = e.target.value;
            dispatch(resumeId, { type: 'section/rename', sectionId, title: title.trim() ? title : undefined });
          }}
        />
      </div>

      {single ? (
        firstItem ? (
          <div className="fields">
            {Object.entries(def.item).map(([field, spec]) => (
              <FieldEditor key={field} itemId={firstItem} field={field} spec={spec} />
            ))}
          </div>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={addItem}>
            <Icon name="plus" /> Add details
          </button>
        )
      ) : (
        <>
          <SortableList
            ids={section.itemOrder}
            listLabel={`${label} entries`}
            scope={`items-${sectionId}`}
            labelOf={labelOf}
            onMove={onMove}
            className="item-list"
            renderRow={(itemId, controls) => (
              <ItemCard
                section={section}
                def={def}
                itemId={itemId}
                controls={controls}
                expanded={expanded.has(itemId)}
                onToggle={() => {
                  toggle(itemId);
                }}
              />
            )}
          />
          <button type="button" className="btn btn-ghost add-entry" onClick={addItem}>
            <Icon name="plus" /> Add entry
          </button>
        </>
      )}
    </section>
  );
}

export function NoSectionSelected() {
  return (
    <section className="card empty-card" id="section-editor" aria-label="Section editor">
      <p>Select a section above to edit it.</p>
    </section>
  );
}
