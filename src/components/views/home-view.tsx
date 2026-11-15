"use client";

import { UP_NEXT } from "@/lib/terms";
import { ArrowUp } from "lucide-react";
import { useMemo } from "react";
import { browseHref, upNextItems, tagsWithCounts } from "@/lib/tree";
import { SortableLists, SortableRow } from "../dnd";
import { NewListButton } from "../list-forms";
import { NavLink } from "../nav-link";
import { useData } from "../store";

export function HomeView() {
  const { snap } = useData();
  const rows = useMemo(() => tagsWithCounts(snap).filter((r) => !r.tag.parentId), [snap]);
  const upNext = useMemo(() => upNextItems(snap).length, [snap]);

  return (
    <>
      {/* Desktop: the sidebar already lists everything, so don't repeat it. */}
      <p className="hidden rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted md:block">
        {rows.length === 0
          ? "Create your first list from the sidebar to get started."
          : "Select a list from the sidebar."}
      </p>

      {/* Phone: the sidebar is a drawer, so the lists live here. */}
      <div className="space-y-6 md:hidden">
        <NavLink
          href={UP_NEXT.href}
          className="flex items-center gap-3.5 rounded-3xl border border-[var(--day-border)] bg-[linear-gradient(135deg,var(--day-wash-a),var(--day-wash-b)),var(--day-card)] px-5 py-5 text-day-ink shadow-[var(--day-shadow)] active:opacity-90"
        >
          <ArrowUp size={32} strokeWidth={2.5} className="shrink-0 text-day" />
          <span className="min-w-0 flex-1 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight">
            {UP_NEXT.name}
          </span>
          {upNext > 0 && (
            <span className="rounded-full bg-day-soft px-3 py-0.5 text-base font-semibold">{upNext}</span>
          )}
        </NavLink>

        <h1 className="text-3xl font-bold tracking-tight text-accent">Lists</h1>

        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
            No lists yet. Create your first one below.
          </p>
        ) : (
          <SortableLists area="home" ids={rows.map((r) => r.tag.id)}>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {rows.map(({ tag, active }) => (
                <SortableRow key={tag.id} area="home" tagId={tag.id} name={tag.name}>
                  {(grip) => (
                    <div className="flex items-center">
                      <NavLink
                        href={browseHref([tag.id])}
                        className="flex min-w-0 flex-1 items-center gap-3 py-4 pl-5 active:bg-accent-soft"
                      >
                        <span className="min-w-0 flex-1 truncate text-[1.05rem] font-medium">
                          {tag.name}
                        </span>
                        {active > 0 && (
                          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-medium text-accent">
                            {active}
                          </span>
                        )}
                      </NavLink>
                      <div className="pr-1">{grip}</div>
                    </div>
                  )}
                </SortableRow>
              ))}
            </div>
          </SortableLists>
        )}

        <div className="rounded-2xl border border-border bg-card p-1 shadow-sm">
          <NewListButton />
        </div>
      </div>
    </>
  );
}
