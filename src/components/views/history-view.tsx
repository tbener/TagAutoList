"use client";

import { ChevronLeft, Undo2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { history } from "@/lib/tree";
import { Button } from "../ui";
import { NavLink, navigate } from "../nav-link";
import { useData } from "../store";

const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function HistoryView({ tagId }: { tagId: string | null }) {
  const data = useData();
  const tag = data.snap.tags.find((t) => t.id === tagId);

  useEffect(() => {
    if (!tag) navigate("/", { replace: true });
  }, [tag]);

  const entries = useMemo(() => (tag ? history(data.snap, tag.id) : []), [data.snap, tag]);
  if (!tag) return null;

  return (
    <>
      <div>
        <NavLink
          href={`/browse?t=${tag.id}`}
          className="flex items-center gap-1 text-sm text-muted hover:text-fg"
        >
          <ChevronLeft size={16} /> {tag.name}
        </NavLink>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">History · {tag.name}</h1>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          Nothing completed in this list yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li
              key={`${e.itemId}-${e.completedAt.getTime()}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.title}</p>
                <p className="text-xs text-muted">{fmt.format(e.completedAt)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => data.restoreCompletion(e.itemId, tag.id)}
              >
                <Undo2 size={14} /> Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
