import type { ItemId, Section } from '@/domain';
import { Icon } from '@/icons';
import { itemTitle, type SectionDef } from '@/sections';
import { useAnnounce, useDispatch, useIsHidden, useItemField } from '@/store';
import { useEditorScope } from '../context';
import { FieldEditor } from '../fields/FieldEditor';
import { DragHandle, MoveButtons } from '../reorder/RowButtons';
import type { RowControls } from '../reorder/SortableList';
import { ConfirmDelete } from './ConfirmDelete';

interface ItemCardProps {
  readonly section: Section;
  readonly def: SectionDef;
  readonly itemId: ItemId;
  readonly controls: RowControls;
  readonly expanded: boolean;
  readonly onToggle: () => void;
}

/** One entry: a header row (reorder, title, hide, delete) and, when expanded, its generated fields. */
export function ItemCard({ section, def, itemId, controls, expanded, onToggle }: ItemCardProps) {
  const { resumeId, variantId, variantLabel } = useEditorScope();
  const titleField = def.titleField ?? Object.keys(def.item).find((k) => def.item[k]?.k === 'text') ?? '';
  const titleValue = useItemField(itemId, titleField);
  const hidden = useIsHidden({ resumeId, variantId }, itemId);
  const dispatch = useDispatch();
  const announce = useAnnounce();
  const title = itemTitle(section, { id: itemId, sectionId: section.id, data: { [titleField]: titleValue } }, controls.index);
  const bodyId = `item-body-${itemId}`;
  return (
    <div className={`item-card${hidden ? ' hidden' : ''}${controls.isDragging ? ' dragging' : ''}`} data-row-label={title}>
      <div className="item-head">
        <DragHandle controls={controls} label={title} />
        <button type="button" className="item-title" aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
          <Icon name={expanded ? 'chevronDown' : 'chevronRight'} />
          <span className="name">{title}</span>
          {hidden ? <span className="kind"> · hidden here</span> : null}
        </button>
        <MoveButtons controls={controls} label={title} />
        <button
          type="button"
          className="icon-btn eye"
          aria-pressed={hidden}
          aria-label={`Hide ${title} in ${variantLabel}`}
          title={hidden ? `Hidden in ${variantLabel}` : `Visible in ${variantLabel}`}
          onClick={() => {
            dispatch(resumeId, { type: 'visibility/set', variantId, node: itemId, hidden: !hidden });
            announce(`${title} ${hidden ? 'shown' : 'hidden'} in ${variantLabel}.`);
          }}
        >
          <Icon name={hidden ? 'eyeOff' : 'eye'} />
        </button>
        <ConfirmDelete
          compact
          what={title}
          onConfirm={() => {
            dispatch(resumeId, { type: 'item/delete', itemId });
            announce(`Deleted ${title}.`);
          }}
        />
      </div>
      <div id={bodyId} className="item-body fields" hidden={!expanded} data-item-body={itemId}>
        {expanded
          ? Object.entries(def.item).map(([field, spec]) => <FieldEditor key={field} itemId={itemId} field={field} spec={spec} />)
          : null}
      </div>
    </div>
  );
}
