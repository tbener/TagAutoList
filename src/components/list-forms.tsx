"use client";

import { Copy, CornerDownRight, History, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sortTags } from "@/lib/tree";
import { cn } from "@/lib/utils";
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

/** Pick the parent for a list (or none). One level only, so only top-level lists qualify. */
function NestDialog({ list, onClose }: { list: { id: string; name: string }; onClose: () => void }) {
  const data = useData();
  const current = data.snap.tags.find((t) => t.id === list.id)?.parentId ?? null;
  const [choice, setChoice] = useState<string | null>(current);
  const parents = sortTags(data.snap.tags.filter((t) => !t.parentId && t.id !== list.id));
  const options: { id: string | null; label: string }[] = [
    { id: null, label: "Top level (no parent)" },
    ...parents.map((t) => ({ id: t.id, label: t.name })),
  ];

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={current ? "Change parent" : "Nest under…"}
      description={`“${list.name}” will show only under the list you pick, not at the top level.`}
    >
      <div role="radiogroup" aria-label="Parent list" className="max-h-[50dvh] space-y-1 overflow-y-auto">
        {options.map((o) => {
          const on = choice === o.id;
          return (
            <button
              key={o.id ?? "none"}
              type="button"
              role="radio"
              aria-checked={on}
              dir="auto"
              onClick={() => setChoice(o.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start text-sm",
                on ? "border-accent bg-accent-soft font-medium text-accent" : "border-transparent hover:bg-accent-soft",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-full border-2",
                  on ? "border-accent" : "border-muted/60",
                )}
              >
                {on && <span className="size-2.5 rounded-full bg-accent" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={choice === current}
          onClick={() => {
            const res = data.setParent(list.id, choice);
            if (res.error) data.flash(res.error);
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

/** The "⋯" menu next to the list title. */
function MoreMenu({ list }: { list: { id: string; name: string } }) {
  const data = useData();
  const [open, setOpen] = useState(false);
  const [nesting, setNesting] = useState(false);
  const tag = data.snap.tags.find((t) => t.id === list.id);
  const hasChildren = data.snap.tags.some((t) => t.parentId === list.id);
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
          className="absolute right-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-xl border border-border bg-card-strong p-1 shadow-lg"
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
          <button
            type="button"
            role="menuitem"
            disabled={hasChildren}
            className="flex w-full flex-col items-start gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-60"
            onClick={() => {
              setOpen(false);
              setNesting(true);
            }}
          >
            <span className="flex items-center gap-2.5">
              <CornerDownRight size={18} className="text-muted" />
              {tag?.parentId ? "Change parent…" : "Nest under…"}
            </span>
            {hasChildren && (
              <span className="pl-[1.8rem] text-xs font-normal text-muted">
                Lists that have nested lists can&apos;t be nested
              </span>
            )}
          </button>
        </div>
      )}
      {nesting && <NestDialog list={list} onClose={() => setNesting(false)} />}
    </div>
  );
}
