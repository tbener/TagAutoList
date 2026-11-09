"use client";

import { Plus, X } from "lucide-react";
import { browseHref, type SubTag, type Tag } from "@/lib/tree";
import { NavLink } from "./nav-link";

/**
 * Mobile-only (the sidebar covers this on desktop): the tags currently
 * combined, each removable, plus co-occurring tags to narrow down further.
 */
export function FilterBar({
  selected,
  suggestions,
}: {
  selected: Tag[];
  suggestions: SubTag[];
}) {
  const path = selected.map((t) => t.id);

  return (
    <div className="space-y-2.5 md:hidden">
      <ul className="flex flex-wrap gap-2">
        {selected.map((tag) => (
          <li key={tag.id}>
            <NavLink
              href={path.length > 1 ? browseHref(path.filter((id) => id !== tag.id)) : "/"}
              aria-label={`Remove ${tag.name}`}
              className="flex items-center gap-1.5 rounded-full bg-accent py-2 pl-4 pr-3 text-[0.95rem] font-medium text-accent-fg shadow-sm"
            >
              {tag.name}
              <X size={16} />
            </NavLink>
          </li>
        ))}
      </ul>

      {suggestions.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <ul className="flex w-max gap-2">
            {suggestions.map(({ tag, count }) => (
              <li key={tag.id}>
                <NavLink
                  href={browseHref([...path, tag.id])}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-accent/60 bg-accent-soft py-2 pl-3 pr-4 text-[0.95rem] font-medium text-accent"
                >
                  <Plus size={16} />
                  {tag.name}
                  <span className="text-xs opacity-70">{count}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
