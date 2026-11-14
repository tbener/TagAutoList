"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { branchSuggestions, browse, browseHref, onlyOnPath } from "@/lib/tree";
import { cn } from "@/lib/utils";
import { AddItemForm } from "../add-item-form";
import { SortableLists } from "../dnd";
import { FilterBar } from "../filter-bar";
import { ItemRow } from "../item-row";
import { ListHeader } from "../list-forms";
import { NavLink, navigate } from "../nav-link";
import { useData } from "../store";

/** "Only this list" is remembered per path on this device (read after mount, never during render). */
function useOnlyFilter(pathKey: string): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  const key = `tal-only:${pathKey}`;
  useEffect(() => {
    try {
      setOn(localStorage.getItem(key) === "1");
    } catch {
      setOn(false);
    }
  }, [key]);
  function set(next: boolean) {
    setOn(next);
    try {
      if (next) localStorage.setItem(key, "1");
      else localStorage.removeItem(key);
    } catch {
      /* storage blocked: it just won't be remembered */
    }
  }
  return [on, set];
}

function OnlyToggle({
  on,
  onChange,
  label,
  hidden,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
  hidden: number;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex min-h-10 items-center gap-2.5 rounded-xl py-1 pr-2 text-sm text-muted"
    >
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border border-border transition-colors",
          on ? "border-transparent bg-cta" : "bg-card",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-5 rounded-full bg-fg/80 shadow transition-transform",
            on && "translate-x-4 bg-cta-fg",
          )}
        />
      </span>
      <span className={cn("font-medium", on && "text-fg")}>{label}</span>
      {on && hidden > 0 && <span className="text-xs">{hidden} hidden</span>}
    </button>
  );
}

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
      // Same rule as the sidebar: a tag covering every item here narrows nothing,
      // but a parent's nested lists are always offered.
      suggestions: branchSuggestions(snap.tags, path, items.length, subTags),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap, pathKey]);

  const [only, setOnly] = useOnlyFilter(pathKey);

  // The rename hint only applies to the first render after duplicating; drop it from the URL.
  useEffect(() => {
    if (rename) navigate(browseHref(path), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!view) return null;

  // Display-only: sub-branches and suggestions above are still computed from all items.
  const shown = only ? onlyOnPath(view.items, path) : view.items;
  const hiddenCount = view.items.length - onlyOnPath(view.items, path).length;

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

      {(hiddenCount > 0 || only) && (
        <OnlyToggle
          on={only}
          onChange={setOnly}
          label={path.length > 1 ? "Only these lists" : "Only this list"}
          hidden={hiddenCount}
        />
      )}

      <AddItemForm
        key={pathKey}
        listNames={current.map((c) => c.name)}
        autoFocus={focus} // set right after creating a list
      />

      {shown.length === 0 && only && view.items.length > 0 ? (
        <div className="rise rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="font-semibold">Nothing here that isn&apos;t also in another list</p>
          <button
            type="button"
            onClick={() => setOnly(false)}
            className="mt-3 rounded-xl bg-accent-soft px-4 py-2 text-sm font-medium text-accent"
          >
            Show all
          </button>
        </div>
      ) : shown.length === 0 ? (
        <div className="rise rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
          <p className="text-lg font-semibold">All clear</p>
          <p className="mt-1 text-sm text-muted">Nothing to do here. Add a task below.</p>
        </div>
      ) : (
        // Reordering only in a single-list view; a drilled-down view is a filtered
        // subset, so it follows the entry list's order and shows no drag affordance.
        <SortableLists area="items" ids={shown.map((i) => i.id)}>
          <ul className="space-y-3">
            {shown.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                allTags={snap.tags}
                contextTagIds={path}
                sortTagId={path.length === 1 && !only ? path[0] : undefined}
              />
            ))}
          </ul>
        </SortableLists>
      )}
    </>
  );
}
