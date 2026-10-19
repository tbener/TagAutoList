"use client";

import { Plus, Tag as TagIcon, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type PickerTag = { id: string; name: string; isList: boolean };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Chips + autocomplete. Pick an existing tag or type a new name; new names are
 * created server-side when the item is saved.
 */
export function TagPicker({
  allTags,
  value,
  onChange,
  placeholder = "Add tag…",
}: {
  allTags: PickerTag[];
  value: string[];
  onChange: (names: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const q = query.trim().replace(/\s+/g, " ");
  const suggestions = allTags
    .filter(
      (t) =>
        !value.some((v) => same(v, t.name)) &&
        t.name.toLowerCase().includes(q.toLowerCase()),
    )
    .slice(0, 6);
  const exact = allTags.find((t) => same(t.name, q));
  const canCreate = q.length > 0 && !exact && !value.some((v) => same(v, q));

  function add(name: string) {
    const n = name.trim();
    if (n && !value.some((v) => same(v, n))) onChange([...value, n]);
    setQuery("");
  }

  return (
    <div className="relative">
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 md:min-h-10">
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-accent"
          >
            {name}
            <button
              type="button"
              aria-label={`Remove ${name}`}
              className="rounded-full p-0.5 hover:bg-accent/20"
              onClick={() => onChange(value.filter((v) => v !== name))}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={query}
          placeholder={value.length ? "" : placeholder}
          className="min-w-24 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-muted md:py-1 md:text-sm"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              if (q) {
                e.preventDefault();
                add(exact?.name ?? suggestions[0]?.name ?? q);
              }
            } else if (e.key === "Backspace" && !query && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
      </div>

      {open && (suggestions.length > 0 || canCreate) && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg">
          {suggestions.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent-soft"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(t.name);
                }}
              >
                <TagIcon size={14} className="text-muted" />
                <span>{t.name}</span>
              </button>
            </li>
          ))}
          {canCreate && (
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-accent hover:bg-accent-soft"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(q);
                }}
              >
                <Plus size={14} /> New list “{q}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
