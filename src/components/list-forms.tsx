"use client";

import { Copy, History, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, navigate } from "./nav-link";
import { useData } from "./store";
import { Button, Input, Modal } from "./ui";

/** Sidebar "New list" — creates the list, then opens it ready for adding tasks. */
export function NewListButton() {
  const data = useData();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[0.95rem] font-medium text-accent hover:bg-accent-soft"
      >
        <Plus size={20} /> New list
      </button>
      <Modal open={open} onOpenChange={setOpen} title="New list">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const res = data.addTag(name);
            if (res.error || !res.id) {
              setError(res.error ?? "Could not create list");
              return;
            }
            setName("");
            setError("");
            setOpen(false);
            navigate(`/browse?t=${res.id}&focus=1`);
          }}
        >
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="List name"
            aria-label="List name"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * The list title with inline rename: click the pencil (or land here right after
 * duplicating) and the title becomes a field with its whole text selected.
 * Enter or blur saves, Escape keeps the current name.
 */
export function ListHeader({
  list,
  startRenaming = false,
}: {
  list: { id: string; name: string };
  startRenaming?: boolean;
}) {
  const data = useData();
  const [editing, setEditing] = useState(startRenaming);
  const [value, setValue] = useState(list.name);
  const input = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    if (!editing) return;
    finished.current = false;
    input.current?.focus();
    input.current?.select();
  }, [editing]);

  function startEditing() {
    setValue(list.name);
    setEditing(true);
  }

  function finish(save: boolean) {
    if (finished.current) return;
    finished.current = true;
    setEditing(false);
    const name = value.trim();
    if (!save || !name || name === list.name) return;
    const res = data.renameTag(list.id, name);
    if (res.error) data.flash(res.error);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {editing ? (
        <input
          ref={input}
          value={value}
          maxLength={60}
          aria-label="List name"
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => finish(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") finish(true);
            else if (e.key === "Escape") finish(false);
          }}
          className="min-w-0 flex-1 rounded-lg border border-accent bg-card px-2 py-0.5 text-3xl font-bold tracking-tight outline-none ring-2 ring-accent/25"
        />
      ) : (
        <h1
          className="min-w-0 flex-1 cursor-text truncate text-3xl font-bold tracking-tight"
          onDoubleClick={startEditing}
        >
          {list.name}
        </h1>
      )}
      <ListActions key={list.id} list={list} onRename={startEditing} />
    </div>
  );
}

/** History / rename / delete for the list being viewed. */
function ListActions({
  list,
  onRename,
}: {
  list: { id: string; name: string };
  onRename: () => void;
}) {
  const data = useData();
  const [deleting, setDeleting] = useState(false);

  const iconBtn = "rounded-xl p-2.5 text-muted hover:bg-accent-soft hover:text-fg";

  return (
    <div className="flex shrink-0 items-center">
      <NavLink
        href={`/history?tag=${list.id}`}
        aria-label="Completed history"
        title="History"
        className={iconBtn}
      >
        <History size={20} />
      </NavLink>
      <button
        type="button"
        aria-label="Rename list"
        title="Rename"
        className={iconBtn}
        onClick={onRename}
      >
        <Pencil size={20} />
      </button>
      <button
        type="button"
        aria-label="Delete list"
        title="Delete"
        className={`${iconBtn} hover:text-danger`}
        onClick={() => setDeleting(true)}
      >
        <Trash2 size={20} />
      </button>
      <MoreMenu list={list} />

      <Modal
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete “${list.name}”?`}
        description="Items in this list are removed from it. Items that aren't in any other list are deleted too. This can't be undone."
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDeleting(false);
              navigate("/");
              data.deleteTag(list.id);
            }}
          >
            Delete list
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** The "⋯" menu next to the list title. */
function MoreMenu({ list }: { list: { id: string; name: string } }) {
  const data = useData();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        title="More"
        className="rounded-xl p-2.5 text-muted hover:bg-accent-soft hover:text-fg"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal size={20} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent-soft"
            onClick={() => {
              setOpen(false);
              const res = data.duplicateList(list.id);
              if (res.id) navigate(`/browse?t=${res.id}&rename=1`);
              else if (res.error) data.flash(res.error);
            }}
          >
            <Copy size={18} className="text-muted" /> Duplicate list
          </button>
        </div>
      )}
    </div>
  );
}
