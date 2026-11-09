"use client";

import { Plus } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useData } from "./store";

/**
 * "Add a task" bar. The item joins every list in the current view and shows
 * up immediately (it saves in the background).
 * Phones: a bar pinned to the bottom of the screen (easy to spot and reach).
 * Desktop: an inline card above the items.
 */
export function AddItemForm({
  listNames,
  autoFocus = false,
}: {
  listNames: string[];
  autoFocus?: boolean;
}) {
  const data = useData();
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd = title.trim().length > 0;

  return (
    <form
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 space-y-1 border-t border-border bg-card/95 p-3 backdrop-blur",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (!canAdd) return;
        const res = data.addItem(title, listNames);
        if (res.error) setError(res.error);
        else {
          setError("");
          setTitle("");
        }
        inputRef.current?.focus(); // keep typing: add the next one right away
      }}
    >
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 rounded-2xl border-2 border-accent/40 bg-card pl-4 pr-2 shadow-sm focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15 md:h-12 md:rounded-xl md:border md:border-border md:pr-4 md:shadow-none md:focus-within:ring-2 md:focus-within:ring-accent/25">
        <Plus size={22} className="shrink-0 text-accent" />
        {/* 16px text stops iOS zooming in on focus. */}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a task"
          aria-label="Add a task"
          enterKeyHint="done"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted md:text-sm"
        />
        <button
          type="submit"
          aria-label="Add task"
          disabled={!canAdd}
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-cta text-cta-fg shadow-sm transition-opacity disabled:opacity-30 md:hidden"
        >
          <Plus size={20} />
        </button>
      </div>
      {error && <p className="mx-auto max-w-3xl px-1 text-sm text-danger">{error}</p>}
    </form>
  );
}
