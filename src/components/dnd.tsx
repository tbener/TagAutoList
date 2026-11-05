"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
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
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { sortTags } from "@/lib/tree";
import { useData } from "./store";

/**
 * One DndContext for the whole app shell, shared by two kinds of draggables
 * (told apart by `data.type`):
 *  - "list": root-level lists (sidebar, drawer, phone home) — sortable.
 *  - "item": item rows of a single-list view — sortable among themselves, and
 *    (desktop only) droppable onto a sidebar row ("tag-drop") to add that tag.
 *
 * The same list can be on screen in several places at once (desktop sidebar,
 * phone drawer, phone home), so every sortable id is prefixed with its `area`
 * and a drop only counts within the same area.
 */
const verticalOnlyForLists: Modifier = ({ transform, active }) =>
  active?.data.current?.type === "list" ? { ...transform, x: 0 } : transform;

/** Lists only meet lists; items meet the sidebar row under the pointer first, then other items. */
const collision: CollisionDetection = (args) => {
  const only = (type: string) =>
    args.droppableContainers.filter((c) => c.data.current?.type === type);
  if (args.active.data.current?.type === "item") {
    const hit = pointerWithin({ ...args, droppableContainers: only("tag-drop") });
    return hit.length ? hit : closestCenter({ ...args, droppableContainers: only("item") });
  }
  return closestCenter({ ...args, droppableContainers: only("list") });
};

const DESKTOP = "(min-width: 768px)";
/** Tailwind `md` and up — where rows drag by their body and drop-to-tag exists. */
export function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(DESKTOP);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

export function AppDnd({ children }: { children: ReactNode }) {
  const { snap, reorderTags, reorderItems, addTagToItem, flash } = useData();
  const [dragTitle, setDragTitle] = useState<string | null>(null);
  const sensors = useSensors(
    // Mouse: a few px of movement, so plain clicks still work.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: a short press, so scrolling and tapping still work.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart({ active }: DragStartEvent) {
    const a = active.data.current;
    setDragTitle(a?.type === "item" ? a.title : null);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragTitle(null);
    const a = active.data.current;
    const o = over?.data.current;
    if (!a || !o) return;

    if (a.type === "list" && o.type === "list" && a.area === o.area && a.tagId !== o.tagId) {
      const ids = sortTags(snap.tags).map((t) => t.id);
      const from = ids.indexOf(a.tagId);
      const to = ids.indexOf(o.tagId);
      if (from >= 0 && to >= 0) reorderTags(arrayMove(ids, from, to));
      return;
    }

    if (a.type === "item" && o.type === "tag-drop") {
      const tag = snap.tags.find((t) => t.id === o.tagId);
      if (!tag) return;
      flash(addTagToItem(a.itemId, o.tagId) ? `Added to ${tag.name}` : `Already in ${tag.name}`);
      return;
    }

    if (a.type === "item" && o.type === "item" && a.area === o.area && a.itemId !== o.itemId) {
      // dnd-kit hands us the list's current order (ids carry the area prefix).
      const ordered = (a.sortable.items as string[]).map((id) => id.slice(a.area.length + 1));
      const from = ordered.indexOf(a.itemId);
      const to = ordered.indexOf(o.itemId);
      if (from >= 0 && to >= 0) reorderItems(a.tagId, arrayMove(ordered, from, to));
    }
  }

  return (
    <DndContext
      id="app-dnd"
      sensors={sensors}
      collisionDetection={collision}
      modifiers={[verticalOnlyForLists]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragTitle(null)}
    >
      {children}
      {/* Item drags float above the sidebar so they can be dropped on a list. */}
      <DragOverlay dropAnimation={null}>
        {dragTitle !== null && (
          <div className="max-w-xs cursor-grabbing truncate rounded-2xl border border-accent/40 bg-card px-4 py-3 text-[1.05rem] font-medium shadow-xl">
            {dragTitle}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

/** A vertically sortable group (lists, or the items of one list). */
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
 * Reorder handle. Always visible on phones; on desktop it appears on
 * hover/focus (the row itself drags too) and is the keyboard-sortable control.
 */
function Grip({
  label,
  rowDrag,
  activatorRef,
  attributes,
  listeners,
}: {
  label: string;
  rowDrag: boolean;
  activatorRef: (el: HTMLElement | null) => void;
  attributes: object;
  listeners: object | undefined;
}) {
  return (
    <button
      type="button"
      ref={activatorRef}
      aria-label={label}
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
}

/**
 * One sortable list row. `children` receives the grip button to place in the
 * row. With `rowDrag` the whole row is draggable (desktop); otherwise only the
 * grip is (phones), and the grip stays visible.
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
    <Grip
      label={`Reorder ${name}`}
      rowDrag={rowDrag}
      activatorRef={setActivatorNodeRef}
      attributes={attributes}
      listeners={listeners}
    />
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

/**
 * Sortable behaviour for an item row (`<li>`). `enabled: false` (drilled-down
 * views) gives a row with no drag affordance at all. Desktop drags by the row
 * body; phones by the grip.
 */
export function useItemSortable(opts: {
  itemId: string;
  tagId: string;
  title: string;
  enabled: boolean;
}) {
  const { itemId, tagId, title, enabled } = opts;
  const area = "items";
  const desktop = useIsDesktop();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${area}:${itemId}`,
    disabled: !enabled,
    data: { type: "item", area, itemId, tagId, title },
  });
  if (!enabled) return null;
  return {
    rowProps: {
      ref: setNodeRef,
      style: { transform: CSS.Translate.toString(transform), transition },
      ...(desktop ? listeners : {}),
    },
    isDragging,
    desktop,
    grip: (
      <Grip
        label={`Reorder ${title}`}
        rowDrag={desktop}
        activatorRef={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
      />
    ),
  };
}

/**
 * A sidebar row an item can be dropped on (desktop only). `target` is true for
 * every such row while an item is being dragged; `over` for the one under the pointer.
 */
export function useTagDrop(key: string, tagId: string, enabled: boolean) {
  const desktop = useIsDesktop();
  const { setNodeRef, isOver, active } = useDroppable({
    id: `drop:${key}`,
    disabled: !enabled || !desktop,
    data: { type: "tag-drop", tagId },
  });
  const target = enabled && desktop && active?.data.current?.type === "item";
  return { setNodeRef, over: target && isOver, target };
}
