"use client";

import { listStyle } from "@/lib/list-color";
import { Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useItemSortable } from "./dnd";
import { NavLink } from "./nav-link";
import { useData } from "./store";
import { TagPicker, type PickerTag } from "./tag-picker";
import { cn } from "@/lib/utils";
import { Button, Input, Modal } from "./ui";

export type RowItem = {
  id: string;
  title: string;
  notes: string;
  tags: PickerTag[]; // active tags only
};

export function ItemRow({
  item,
  allTags,
  contextTagIds = [],
  sortTagId,
}: {
  item: RowItem;
  allTags: PickerTag[];
  /** Tags of the current browse path, pre-selected when completing. */
  contextTagIds?: string[];
  /** Set in a single-list view: the row can be dragged to reorder within this list. */
  sortTagId?: string;
}) {
  const data = useData();
  const sort = useItemSortable({
    itemId: item.id,
    tagId: sortTagId ?? "",
    title: item.title,
    enabled: !!sortTagId,
  });
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [done, setDone] = useState(false);

  function onCheck() {
    if (item.tags.length !== 1) return setCompleting(true);
    // Play the check-off animation, then complete (the store ref is stable, so
    // this is safe even if the row unmounts in between).
    setDone(true);
    const { id } = item;
    const tagId = item.tags[0].id;
    window.setTimeout(() => data.completeItem(id, [tagId]), 380);
  }

  // The dialogs are siblings of the <li>, not children: React events bubble
  // through portals, and a press inside a dialog must never start a row drag.
  return (
    <>
      <li
        {...sort?.rowProps}
        className={cn(
          "rise group/row flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-lg",
          done && "is-done",
          sort?.desktop && "cursor-grab",
          sort?.isDragging && "opacity-40",
        )}
      >
        <button
          type="button"
          aria-label={`Complete ${item.title}`}
          onClick={onCheck}
          className="check mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 border-muted/60 text-transparent transition-colors hover:border-cta hover:bg-cta-soft hover:text-cta active:scale-95"
        >
          <Check size={16} strokeWidth={3} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="title break-words text-[1.05rem] font-medium leading-snug">
            {item.title}
          </p>
          {item.notes && (
            <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted">
              {item.notes}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.tags.map((t) => (
              <NavLink
                key={t.id}
                href={`/browse?t=${t.id}`}
                style={listStyle(t.id)}
                className="lc-chip rounded-full px-2.5 py-1 text-xs font-semibold hover:opacity-80"
              >
                {t.name}
              </NavLink>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label="Edit"
          onClick={() => setEditing(true)}
          className="-mr-2 shrink-0 rounded-xl p-2.5 text-muted hover:bg-accent-soft"
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          aria-label="Delete"
          onClick={() => setDeleting(true)}
          className="-mr-1 shrink-0 rounded-xl p-2.5 text-muted hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={18} />
        </button>
        {sort?.grip}
      </li>

      {completing && (
        <TagActionDialog
          mode="complete"
          item={item}
          initial={contextTagIds.filter((id) =>
            item.tags.some((t) => t.id === id),
          )}
          onClose={() => setCompleting(false)}
        />
      )}
      {deleting &&
        (item.tags.length > 1 ? (
          <TagActionDialog
            mode="delete"
            item={item}
            initial={[]}
            onClose={() => setDeleting(false)}
          />
        ) : (
          <ConfirmDeleteDialog item={item} onClose={() => setDeleting(false)} />
        ))}
      {editing && (
        <EditDialog
          item={item}
          allTags={allTags}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

/** Multi-tag items: pick which associations to complete or remove. */
function TagActionDialog({
  mode,
  item,
  initial,
  onClose,
}: {
  mode: "complete" | "delete";
  item: RowItem;
  initial: string[];
  onClose: () => void;
}) {
  const data = useData();
  const isDelete = mode === "delete";
  const allIds = item.tags.map((t) => t.id);
  const [selected, setSelected] = useState<string[]>(
    isDelete ? [] : initial.length ? initial : allIds,
  );

  const toggle = (id: string) =>
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );

  function run(ids: string[]) {
    if (isDelete) data.removeItemFromTags(item.id, ids);
    else data.completeItem(item.id, ids);
    onClose();
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={isDelete ? "Remove from which lists?" : "Complete in which lists?"}
      description={
        isDelete
          ? `“${item.title}” is in several lists. Unchecked lists keep it.`
          : `“${item.title}” is in several lists. Unchecked lists keep it active.`
      }
    >
      <Button
        variant={isDelete ? "danger" : "primary"}
        className="mb-3 w-full"
        onClick={() => run(allIds)}
      >
        {isDelete ? "Delete from all lists" : "Complete in all lists"}
      </Button>
      <ul className="space-y-1">
        {item.tags.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-accent-soft">
              <input
                type="checkbox"
                className="size-5 accent-[var(--accent)]"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
              />
              <span className="font-medium">{t.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={isDelete ? "danger" : "primary"}
          disabled={!selected.length}
          onClick={() => run(selected)}
        >
          {isDelete ? "Remove" : "Complete"}
        </Button>
      </div>
    </Modal>
  );
}

/** Single-list items: light confirmation before deleting. */
function ConfirmDeleteDialog({
  item,
  onClose,
}: {
  item: RowItem;
  onClose: () => void;
}) {
  const data = useData();
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Delete “${item.title}”?`}
    >
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            data.deleteItem(item.id);
            onClose();
          }}
        >
          Delete
        </Button>
      </div>
    </Modal>
  );
}

function EditDialog({
  item,
  allTags,
  onClose,
}: {
  item: RowItem;
  allTags: PickerTag[];
  onClose: () => void;
}) {
  const data = useData();
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes);
  const [tagNames, setTagNames] = useState(item.tags.map((t) => t.name));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Edit item">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const res = data.updateItem(item.id, { title, notes, tagNames });
          if (res.error) setError(res.error);
          else onClose();
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Title"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25 md:text-sm"
        />
        <TagPicker
          allTags={allTags}
          value={tagNames}
          onChange={setTagNames}
          placeholder="Add to list…"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {confirmDelete ? (
            <Button
              variant="danger"
              onClick={() => {
                data.deleteItem(item.id);
                onClose();
              }}
            >
              Confirm delete
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} /> Delete
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !tagNames.length}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
