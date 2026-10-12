import { Plus, X } from "lucide-react";
import Link from "next/link";
import { browseHref, type SubTag, type Tag } from "@/lib/tree";

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
    <div className="space-y-2 md:hidden">
      <ul className="flex flex-wrap gap-2">
        {selected.map((tag) => (
          <li key={tag.id}>
            <Link
              href={path.length > 1 ? browseHref(path.filter((id) => id !== tag.id)) : "/"}
              aria-label={`Remove ${tag.name}`}
              className="flex items-center gap-1 rounded-full bg-accent py-1.5 pl-3 pr-2 text-sm font-medium text-accent-fg"
            >
              {tag.name}
              <X size={14} />
            </Link>
          </li>
        ))}
      </ul>

      {suggestions.length > 0 && (
        <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <ul className="flex w-max gap-2">
            {suggestions.map(({ tag, count }) => (
              <li key={tag.id}>
                <Link
                  href={browseHref([...path, tag.id])}
                  className="flex items-center gap-1 rounded-full border border-dashed border-accent/60 bg-accent-soft py-1.5 pl-2.5 pr-3 text-sm font-medium text-accent"
                >
                  <Plus size={14} />
                  {tag.name}
                  <span className="text-xs opacity-70">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
