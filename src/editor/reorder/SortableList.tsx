import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import { useAnnounce } from '@/store';
import { attr, focusSoon } from '../a11y/focus';
import { useReducedMotion } from '../a11y/useReducedMotion';

/** Everything a row needs to render its drag handle and Move up/down buttons. */
export interface RowControls {
  readonly index: number;
  readonly count: number;
  readonly isDragging: boolean;
  /** Spread onto the drag-handle <button>. Includes dnd-kit's keyboard listeners and ARIA attributes. */
  readonly handleProps: Readonly<Record<string, unknown>> & { readonly ref: (el: HTMLElement | null) => void };
  readonly moveUp: () => void;
  readonly moveDown: () => void;
  /** data-* attributes that let focus return to the same control after a move. */
  readonly controlAttrs: (control: 'up' | 'down' | 'handle') => Record<string, string>;
}

interface SortableListProps<Id extends string> {
  readonly ids: readonly Id[];
  /** Accessible name of the list, e.g. "Sections". */
  readonly listLabel: string;
  /** Scope for focus restoration, unique per list on the page. */
  readonly scope: string;
  /** Human label of a row, used in announcements. */
  readonly labelOf: (id: Id) => string;
  /** Dispatches the move. Drag-and-drop and Move up/down both end here (the same domain command). */
  readonly onMove: (id: Id, toIndex: number) => void;
  readonly renderRow: (id: Id, controls: RowControls) => ReactNode;
  readonly className?: string;
}

const instructions =
  'To reorder, press Space or Enter on the drag handle to pick the item up. Use the up and down arrow keys to move it, Space or Enter to drop it, or Escape to cancel. You can also use the Move up and Move down buttons.';

// dnd-kit's built-in live region is assertive; silence it and route announcements to the editor's polite region.
const silent: Announcements = {
  onDragStart: () => undefined,
  onDragOver: () => undefined,
  onDragEnd: () => undefined,
  onDragCancel: () => undefined,
};

/**
 * Keyboard- and pointer-accessible vertical reordering. Generic over the id type so sections and items share it.
 */
export function SortableList<Id extends string>({ ids, listLabel, scope, labelOf, onMove, renderRow, className }: SortableListProps<Id>) {
  const announce = useAnnounce();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const count = ids.length;
  const indexOf = useCallback((id: UniqueIdentifier) => ids.findIndex((x) => x === id), [ids]);
  const label = useCallback((id: UniqueIdentifier) => {
    const match = ids.find((x) => x === id);
    return match === undefined ? 'Item' : labelOf(match);
  }, [ids, labelOf]);

  const move = useCallback(
    (id: Id, toIndex: number, control: 'up' | 'down' | 'handle') => {
      if (toIndex < 0 || toIndex >= count || ids[toIndex] === id) return;
      onMove(id, toIndex);
      announce(`Moved ${labelOf(id)} to position ${toIndex + 1} of ${count}.`);
      const base = `[data-reorder-scope="${attr(scope)}"][data-reorder-id="${attr(id)}"]`;
      const other = control === 'up' ? 'down' : 'up';
      focusSoon(`${base}[data-reorder-control="${control}"]`, `${base}[data-reorder-control="${other}"]`, `${base}[data-reorder-control="handle"]`);
    },
    [announce, count, ids, labelOf, onMove, scope],
  );

  // dnd-kit reports "over" on every collision update (including over itself right after pick-up);
  // announce only when the target position actually changes.
  const lastOver = useRef<UniqueIdentifier | null>(null);
  const handlers = useMemo(
    () => ({
      onDragStart: ({ active }: DragStartEvent) => {
        lastOver.current = active.id;
        announce(`Picked up ${label(active.id)}, position ${indexOf(active.id) + 1} of ${count}.`);
      },
      onDragOver: ({ active, over }: DragOverEvent) => {
        if (!over || over.id === lastOver.current) return;
        lastOver.current = over.id;
        announce(`${label(active.id)} is over position ${indexOf(over.id) + 1} of ${count}.`);
      },
      onDragEnd: ({ active, over }: DragEndEvent) => {
        const id = ids.find((x) => x === active.id);
        const to = over ? indexOf(over.id) : -1;
        if (id === undefined || to < 0 || to === indexOf(active.id)) {
          announce(`${label(active.id)} dropped at position ${indexOf(active.id) + 1} of ${count}.`);
          return;
        }
        onMove(id, to);
        announce(`Moved ${label(active.id)} to position ${to + 1} of ${count}.`);
      },
      onDragCancel: ({ active }: { active: { id: UniqueIdentifier } }) => {
        announce(`Reorder cancelled. ${label(active.id)} stays at position ${indexOf(active.id) + 1} of ${count}.`);
      },
    }),
    [announce, count, ids, indexOf, label, onMove],
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements: silent, screenReaderInstructions: { draggable: instructions } }}
      {...handlers}
    >
      <SortableContext items={ids as Id[]} strategy={verticalListSortingStrategy}>
        <ul className={className} aria-label={listLabel}>
          {ids.map((id, index) => (
            <SortableRow key={id} id={id} scope={scope} index={index} count={count} move={move} renderRow={renderRow} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface SortableRowProps<Id extends string> {
  readonly id: Id;
  readonly scope: string;
  readonly index: number;
  readonly count: number;
  readonly move: (id: Id, toIndex: number, control: 'up' | 'down' | 'handle') => void;
  readonly renderRow: (id: Id, controls: RowControls) => ReactNode;
}

function SortableRow<Id extends string>({ id, scope, index, count, move, renderRow }: SortableRowProps<Id>) {
  const reduced = useReducedMotion();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    ...(reduced ? { transition: null } : {}),
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    ...(transition ? { transition } : {}),
  };
  const controls: RowControls = {
    index,
    count,
    isDragging,
    handleProps: { ...attributes, ...listeners, ref: setActivatorNodeRef },
    moveUp: () => {
      move(id, index - 1, 'up');
    },
    moveDown: () => {
      move(id, index + 1, 'down');
    },
    controlAttrs: (control) => ({ 'data-reorder-scope': scope, 'data-reorder-id': id, 'data-reorder-control': control }),
  };
  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'sortable-row is-dragging' : 'sortable-row'} data-testid={`row-${id}`}>
      {renderRow(id, controls)}
    </li>
  );
}
