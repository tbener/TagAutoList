"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useMemo } from "react";
import { browse, browseHref } from "@/lib/tree";
import { AddItemForm } from "../add-item-form";
import { SortableLists } from "../dnd";
import { FilterBar } from "../filter-bar";
import { ItemRow } from "../item-row";
import { ListHeader } from "../list-forms";
import { NavLink, navigate } from "../nav-link";
import { useData } from "../store";

export function BrowseView({
  ids,
  focus,
  rename,
}: {
  ids: string[];
  focus: boolean;
  /** Land with the title in rename mode (right after duplicating a list). */
  rename: boolean;
}) {
  const { snap } = useData();

  const idKey = ids.join(",");
  const path = useMemo(() => {
    const known = new Set(snap.tags.map((t) => t.id));
    return [...new Set(ids)].filter((id) => known.has(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.tags, idKey]);
  const pathKey = path.join(",");

  // Nothing valid selected (e.g. the list was just deleted): back to Home.
  useEffect(() => {
    if (path.length === 0) navigate("/", { replace: true });
  }, [path.length]);

  const view = useMemo(() => {
    if (path.length === 0) return null;
    const { items, subTags } = browse(snap, path);
    return {
      items,
      // Same rule as the sidebar: a tag covering every item here narrows nothing.
      suggestions: subTags.filter((s) => s.count < items.length),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, pathKey]);

  // The rename hint only applies to the first render after duplicating; drop it from the URL.
  useEffect(() => {
    if (rename) navigate(browseHref(path), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!view) return null;

  const byId = new Map(snap.tags.map((t) => [t.id, t]));
  const current = path.map((id) => byId.get(id)!);
  const last = current[current.length - 1];

  return (
    <>
      <FilterBar selected={current} suggestions={view.suggestions} />

      <div className="space-y-1">
        {current.length > 1 && (
          <nav className="hidden flex-wrap items-center gap-1 text-sm text-muted md:flex">
            {current.slice(0, -1).map((tag, i) => (
              <span key={tag.id} className="flex items-center gap-1">
                <NavLink href={browseHref(path.slice(0, i + 1))} className="hover:text-fg">
                  {tag.name}
                </NavLink>
                <ChevronRight size={14} />
              </span>
            ))}
          </nav>
        )}
        <ListHeader key={last.id} list={last} startRenaming={rename} />
      </div>

      <AddItemForm
        key={pathKey}
        listNames={current.map((c) => c.name)}
        autoFocus={focus} // set right after creating a list
      />

      {view.items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          Nothing to do here.
        </p>
      ) : (
        // Reordering only in a single-list view; a drilled-down view is a filtered
        // subset, so it follows the entry list's order and shows no drag affordance.
        <SortableLists area="items" ids={view.items.map((i) => i.id)}>
          <ul className="space-y-3">
            {view.items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                allTags={snap.tags}
                contextTagIds={path}
                sortTagId={path.length === 1 ? path[0] : undefined}
              />
            ))}
          </ul>
        </SortableLists>
      )}
    </>
  );
}
