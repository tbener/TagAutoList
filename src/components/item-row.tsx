"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { NavLink } from "./nav-link";
import { useData } from "./store";
import { TagPicker, type PickerTag } from "./tag-picker";
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
}: {
  item: RowItem;
  allTags: PickerTag[];
  /** Tags of the current browse path, pre-selected when completing. */
  contextTagIds?: string[];
}) {
  const data = useData();
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);

  function onCheck() {
    if (item.tags.length === 1) data.completeItem(item.id, [item.tags[0].id]);
    else setCompleting(true);
  }

  return (
    <li className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <button
        type="button"
        aria-label={`Complete ${item.title}`}
        onClick={onCheck}
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 border-muted/60 text-transparent transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent active:scale-95"
      >
        <Check size={16} strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="break-words text-[1.05rem] font-medium leading-snug">{item.title}</p>
        {item.notes && (
          <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted">{item.notes}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <NavLink
              key={t.id}
              href={`/browse?t=${t.id}`}
              className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent hover:opacity-80"
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
        className="-mr-1 shrink-0 rounded-xl p-2.5 text-muted hover:bg-accent-soft"
      >
        <Pencil size={18} />
      </button>

      {completing && (
        <CompleteDialog
          item={item}
          initial={contextTagIds.filter((id) => item.tags.some((t) => t.id === id))}
          onClose={() => setCompleting(false)}
        />
      )}
      {editing && <EditDialog item={item} allTags={allTags} onClose={() => setEditing(false)} />}
    </li>
  );
}

/** Multi-tag items: pick which associations are being completed. */
function CompleteDialog({
  item,
  initial,
  onClose,
}: {
  item: RowItem;
  initial: string[];
  onClose: () => void;
}) {
  const data = useData();
  const [selected, setSelected] = useState<string[]>(
    initial.length ? initial : item.tags.map((t) => t.id),
  );
  const allSelected = selected.length === item.tags.length;

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Complete in which lists?"
      description={`“${item.title}” is in several lists. Unchecked lists keep it active.`}
    >
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
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelected(allSelected ? [] : item.tags.map((t) => t.id))}
        >
          {allSelected ? "Select none" : "Select all"}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selected.length}
            onClick={() => {
              data.completeItem(item.id, selected);
              onClose();
            }}
          >
            Complete
          </Button>
        </div>
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
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-base outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25 md:text-sm"
        />
        <TagPicker allTags={allTags} value={tagNames} onChange={setTagNames} placeholder="Add to list…" />
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
            <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
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
