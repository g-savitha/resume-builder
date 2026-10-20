import { useCallback } from 'react';
import type { SectionId } from '@/domain';
import { Icon } from '@/icons';
import { sectionDef, sectionLabel } from '@/sections';
import { useAnnounce, useDispatch, useIsHidden, useSection, useSectionOrder } from '@/store';
import { useEditorScope } from '../context';
import { DragHandle, MoveButtons } from '../reorder/RowButtons';
import { SortableList, type RowControls } from '../reorder/SortableList';
import { AddSectionMenu } from './AddSectionMenu';
import { useSectionLabels } from './useLabels';

interface SectionsCardProps {
  readonly selected: SectionId | null;
  readonly onSelect: (id: SectionId) => void;
}

export function SectionsCard({ selected, onSelect }: SectionsCardProps) {
  const { resumeId } = useEditorScope();
  const order = useSectionOrder(resumeId);
  const dispatch = useDispatch();
  const labelOf = useSectionLabels();
  const onMove = useCallback(
    (sectionId: SectionId, toIndex: number) => {
      dispatch(resumeId, { type: 'section/move', sectionId, toIndex });
    },
    [dispatch, resumeId],
  );
  return (
    <section className="card" aria-labelledby="sections-heading">
      <div className="card-head">
        <h2 id="sections-heading">Sections</h2>
        <AddSectionMenu onAdded={onSelect} />
      </div>
      <SortableList
        ids={order}
        listLabel="Sections, in resume order"
        scope="sections"
        labelOf={labelOf}
        onMove={onMove}
        className="slist"
        renderRow={(id, controls) => <SectionRow id={id} controls={controls} selected={selected === id} onSelect={onSelect} />}
      />
    </section>
  );
}

function SectionRow({
  id,
  controls,
  selected,
  onSelect,
}: {
  readonly id: SectionId;
  readonly controls: RowControls;
  readonly selected: boolean;
  readonly onSelect: (id: SectionId) => void;
}) {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const section = useSection(id);
  const hidden = useIsHidden({ resumeId, variantId }, id);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  if (!section) return null;
  const label = sectionLabel(section);
  const def = sectionDef(section.kind);
  const kindLabel = def?.defaultLabel ?? section.kind;
  return (
    <div className={`srow${selected ? ' active' : ''}${hidden ? ' hidden' : ''}`} data-row-label={label}>
      <DragHandle controls={controls} label={label} />
      {def?.defaultIcon ? (
        <span className="srow-icon">
          <Icon name={def.defaultIcon} />
        </span>
      ) : null}
      <button
        type="button"
        className="srow-name"
        aria-current={selected ? 'true' : undefined}
        aria-controls="section-editor"
        onClick={() => {
          onSelect(id);
        }}
      >
        <span className="name">{label}</span>
        {label !== kindLabel ? <span className="kind"> · {kindLabel}</span> : null}
        {hidden ? <span className="kind hidden-note"> · hidden here</span> : null}
      </button>
      <MoveButtons controls={controls} label={label} />
      <button
        type="button"
        className="icon-btn eye"
        aria-pressed={hidden}
        aria-label={`Hide ${label} in ${variantLabel}`}
        title={hidden ? `Hidden in ${variantLabel}` : `Visible in ${variantLabel}`}
        onClick={() => {
          dispatch(resumeId, { type: 'visibility/set', variantId, node: id, hidden: !hidden });
          announce(`${label} ${hidden ? 'shown' : 'hidden'} in ${variantLabel}.`);
        }}
      >
        <Icon name={hidden ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  );
}
