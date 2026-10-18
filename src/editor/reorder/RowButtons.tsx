import { Icon } from '@/icons';
import type { RowControls } from './SortableList';

/** Drag handle: a real <button> carrying dnd-kit's keyboard sensor. */
export function DragHandle({ controls, label }: { readonly controls: RowControls; readonly label: string }) {
  const { ref, ...rest } = controls.handleProps;
  return (
    <button type="button" ref={ref} {...rest} {...controls.controlAttrs('handle')} className="icon-btn grip" aria-label={`Reorder ${label}`}>
      <Icon name="grip" />
    </button>
  );
}

/** Move up / Move down: the non-drag alternative, dispatching the same move command. */
export function MoveButtons({ controls, label }: { readonly controls: RowControls; readonly label: string }) {
  if (controls.isDragging) {
    // Visual cue for sighted keyboard users while a row is lifted; screen readers get the same
    // instructions through the handle's aria-describedby and the live region.
    return (
      <span className="drag-hint" aria-hidden="true">
        ↑↓ move · Space drop
      </span>
    );
  }
  const first = controls.index === 0;
  const last = controls.index === controls.count - 1;
  return (
    <span className="move-btns">
      <button
        type="button"
        className="icon-btn"
        aria-label={`Move ${label} up`}
        title="Move up"
        disabled={first}
        onClick={controls.moveUp}
        {...controls.controlAttrs('up')}
      >
        <Icon name="chevronUp" />
      </button>
      <button
        type="button"
        className="icon-btn"
        aria-label={`Move ${label} down`}
        title="Move down"
        disabled={last}
        onClick={controls.moveDown}
        {...controls.controlAttrs('down')}
      >
        <Icon name="chevronDown" />
      </button>
    </span>
  );
}
