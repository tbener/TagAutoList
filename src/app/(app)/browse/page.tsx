import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddItemForm } from "@/components/add-item-form";
import { FilterBar } from "@/components/filter-bar";
import { ItemRow } from "@/components/item-row";
import { ListActions } from "@/components/list-forms";
import { getSnapshot } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { browse, browseHref } from "@/lib/tree";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const user = await requireUser();
  const { t } = await searchParams;
  const snap = await getSnapshot(user.id);

  const byId = new Map(snap.tags.map((tag) => [tag.id, tag]));
  const path = [...new Set([t ?? []].flat())].filter((id) => byId.has(id));
  if (path.length === 0) redirect("/");

  const { items, subTags } = browse(snap, path);
  // Same rule as the sidebar: a tag covering every item here narrows nothing.
  const suggestions = subTags.filter((s) => s.count < items.length);
  const current = path.map((id) => byId.get(id)!);
  const last = current[current.length - 1];

  return (
    <>
      <FilterBar selected={current} suggestions={suggestions} />

      <div className="space-y-1">
        {current.length > 1 && (
          <nav className="hidden flex-wrap items-center gap-1 text-sm text-muted md:flex">
            {current.slice(0, -1).map((tag, i) => (
              <span key={tag.id} className="flex items-center gap-1">
                <Link href={browseHref(path.slice(0, i + 1))} className="hover:text-fg">
                  {tag.name}
                </Link>
                <ChevronRight size={14} />
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-center justify-between gap-3">
          <h1 className="truncate text-3xl font-semibold text-accent">{last.name}</h1>
          <ListActions key={last.id} list={last} />
        </div>
      </div>

      <AddItemForm key={path.join(",")} listNames={current.map((c) => c.name)} />

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          Nothing to do here.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} allTags={snap.tags} contextTagIds={path} />
          ))}
        </ul>
      )}
    </>
  );
}
