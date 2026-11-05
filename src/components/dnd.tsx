"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { sortTags } from "@/lib/tree";
import { useData } from "./store";

/**
 * One DndContext for the whole app shell, so list sorting (here) and item
 * dragging (later) share sensors and one drag lifecycle. Draggables carry a
 * `type` in their data; `onDragEnd` below only handles `type: "list"`.
 *
 * The same list can be on screen in several places at once (desktop sidebar,
 * phone drawer, phone home), so every sortable id is prefixed with its `area`
 * and a drop only counts within the same area.
 */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export function AppDnd({ children }: { children: ReactNode }) {
  const { snap, reorderTags } = useData();
  const sensors = useSensors(
    // Mouse: a few px of movement, so plain clicks still navigate.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: a short press, so scrolling and tapping still work.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    const a = active.data.current;
    const o = over?.data.current;
    if (a?.type !== "list" || o?.type !== "list" || a.area !== o.area) return;
    if (a.tagId === o.tagId) return;
    const ids = sortTags(snap.tags).map((t) => t.id);
    const from = ids.indexOf(a.tagId);
    const to = ids.indexOf(o.tagId);
    if (from < 0 || to < 0) return;
    reorderTags(arrayMove(ids, from, to));
  }

  return (
    <DndContext
      id="app-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={onDragEnd}
    >
      {children}
    </DndContext>
  );
}

/** A vertically sortable group of lists (root-level only). */
export function SortableLists({
  area,
  ids,
  children,
}: {
  area: string;
  ids: string[];
  children: ReactNode;
}) {
  return (
    <SortableContext
      id={area}
      items={ids.map((id) => `${area}:${id}`)}
      strategy={verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  );
}

/**
 * One sortable list row. `children` receives the grip button to place in the
 * row. With `rowDrag` the whole row is draggable (desktop); otherwise only the
 * grip is (phones), and the grip stays visible. The grip is also the
 * keyboard-sortable control.
 */
export function SortableRow({
  area,
  tagId,
  name,
  rowDrag = false,
  className,
  children,
}: {
  area: string;
  tagId: string;
  name: string;
  rowDrag?: boolean;
  className?: string;
  children: (grip: ReactNode) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${area}:${tagId}`, data: { type: "list", area, tagId } });

  const grip = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={`Reorder ${name}`}
      {...attributes}
      {...listeners}
      className={cn(
        "grid size-10 shrink-0 touch-none place-items-center rounded-lg text-muted",
        rowDrag
          ? "cursor-grab opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100"
          : "active:bg-accent-soft",
      )}
    >
      <GripVertical size={18} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...(rowDrag ? listeners : {})}
      className={cn(
        "group/row relative",
        rowDrag && "cursor-grab",
        isDragging && "z-10 rounded-xl bg-card opacity-95 shadow-lg ring-1 ring-accent/30",
        className,
      )}
    >
      {children(grip)}
    </div>
  );
}
