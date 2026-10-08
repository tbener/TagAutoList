"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { createItem } from "@/app/actions";

/** "Add a task" bar. The item joins every list in the current view. */
export function AddItemForm({ listNames }: { listNames: string[] }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setError("");
        start(async () => {
          const res = await createItem({ title, tagNames: listNames });
          if (res.error) setError(res.error);
          else setTitle("");
        });
      }}
    >
      <label className="flex h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        <Plus size={20} className="text-accent" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          placeholder="Add a task"
          aria-label="Add a task"
          className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
      </label>
      {error && <p className="px-1 text-sm text-danger">{error}</p>}
    </form>
  );
}
