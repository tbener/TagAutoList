"use client";

import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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

/** History / rename / delete for the list being viewed. */
export function ListActions({ list }: { list: { id: string; name: string } }) {
  const data = useData();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(list.name);
  const [error, setError] = useState("");

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
        onClick={() => {
          setName(list.name);
          setError("");
          setRenaming(true);
        }}
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

      <Modal open={renaming} onOpenChange={setRenaming} title="Rename list">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const res = data.renameTag(list.id, name);
            if (res.error) setError(res.error);
            else setRenaming(false);
          }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="List name" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Save
            </Button>
          </div>
        </form>
      </Modal>

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
