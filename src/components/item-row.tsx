"use client";

import { Check, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { completeItem, deleteItem, updateItem } from "@/app/actions";
import { cn } from "@/lib/utils";
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
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [completing, setCompleting] = useState(false);

  function onCheck() {
    if (item.tags.length === 1) start(() => completeItem(item.id, [item.tags[0].id]));
    else setCompleting(true);
  }

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-opacity",
        pending && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label={`Complete ${item.title}`}
        onClick={onCheck}
        className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 border-muted/60 text-transparent transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
      >
        <Check size={14} strokeWidth={3} />
      </button>

      <div className="min-w-0 flex-1">
        <p className="break-words font-medium leading-snug">{item.title}</p>
        {item.notes && (
          <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-muted">{item.notes}</p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.tags.map((t) => (
            <Link
              key={t.id}
              href={`/browse?t=${t.id}`}
              className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent hover:opacity-80"
            >
              {t.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          aria-label="Edit"
          onClick={() => setEditing(true)}
          className="rounded-md p-2 text-muted hover:bg-accent-soft"
        >
          <Pencil size={16} />
        </button>
      </div>

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
  const [selected, setSelected] = useState<string[]>(
    initial.length ? initial : item.tags.map((t) => t.id),
  );
  const [pending, start] = useTransition();
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
            <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent-soft">
              <input
                type="checkbox"
                className="size-4 accent-[var(--accent)]"
                checked={selected.includes(t.id)}
                onChange={() => toggle(t.id)}
              />
              <span className="text-sm font-medium">{t.name}</span>
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
            disabled={!selected.length || pending}
            onClick={() =>
              start(async () => {
                await completeItem(item.id, selected);
                onClose();
              })
            }
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
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes);
  const [tagNames, setTagNames] = useState(item.tags.map((t) => t.name));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} title="Edit item">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          start(async () => {
            const res = await updateItem(item.id, { title, notes, tagNames });
            if (res.error) setError(res.error);
            else onClose();
          });
        }}
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          rows={3}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        <TagPicker allTags={allTags} value={tagNames} onChange={setTagNames} placeholder="Add to list…" />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center justify-between pt-1">
          {confirmDelete ? (
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteItem(item.id);
                  onClose();
                })
              }
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
            <Button type="submit" disabled={pending || !title.trim() || !tagNames.length}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
