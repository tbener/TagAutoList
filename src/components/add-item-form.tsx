"use client";

import { Plus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { createItem } from "@/app/actions";

/** "Add a task" bar. The item joins every list in the current view. */
export function AddItemForm({
  listNames,
  autoFocus = false,
}: {
  listNames: string[];
  autoFocus?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || pending) return;
        setError("");
        start(async () => {
          const res = await createItem({ title, tagNames: listNames });
          if (res.error) setError(res.error);
          else setTitle("");
          inputRef.current?.focus(); // keep typing: add the next one right away
        });
      }}
    >
      <label className="flex h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <Plus size={20} className="text-accent" />
        {/* Not disabled while saving: a disabled input drops focus. */}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          aria-label="Add a task"
          enterKeyHint="done"
          className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>
      {error && <p className="px-1 text-sm text-danger">{error}</p>}
    </form>
  );
}
