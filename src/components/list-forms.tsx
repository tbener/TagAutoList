"use client";

import { History, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createTag, deleteTag, renameTag } from "@/app/actions";
import { browseHref } from "@/lib/tree";
import { Button, Input, Modal } from "./ui";

/** Sidebar "New list" — creates the list, then opens it. */
export function NewListButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
      >
        <Plus size={18} /> New list
      </button>
      <Modal open={open} onOpenChange={setOpen} title="New list">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            start(async () => {
              const res = await createTag(name, true);
              if (res.error || !res.id) setError(res.error ?? "Could not create list");
              else {
                setName("");
                setOpen(false);
                router.push(browseHref([res.id]));
              }
            });
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
            <Button type="submit" disabled={pending || !name.trim()}>
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
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(list.name);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const iconBtn = "rounded-md p-2 text-muted hover:bg-accent-soft hover:text-fg";

  return (
    <div className="flex items-center">
      <Link href={`/history?tag=${list.id}`} aria-label="Completed history" title="History" className={iconBtn}>
        <History size={18} />
      </Link>
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
        <Pencil size={18} />
      </button>
      <button
        type="button"
        aria-label="Delete list"
        title="Delete"
        className={`${iconBtn} hover:text-danger`}
        onClick={() => setDeleting(true)}
      >
        <Trash2 size={18} />
      </button>

      <Modal open={renaming} onOpenChange={setRenaming} title="Rename list">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await renameTag(list.id, name);
              if (res.error) setError(res.error);
              else setRenaming(false);
            });
          }}
        >
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="List name" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
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
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteTag(list.id);
                setDeleting(false);
                router.push("/");
              })
            }
          >
            Delete list
          </Button>
        </div>
      </Modal>
    </div>
  );
}
