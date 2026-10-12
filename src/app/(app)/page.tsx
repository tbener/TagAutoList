import { List } from "lucide-react";
import Link from "next/link";
import { NewListButton } from "@/components/list-forms";
import { getSnapshot } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { browseHref, tagsWithCounts } from "@/lib/tree";

export default async function HomePage() {
  const user = await requireUser();
  const rows = tagsWithCounts(await getSnapshot(user.id));

  return (
    <>
      <h1 className="text-3xl font-semibold text-accent">Lists</h1>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          No lists yet. Create your first one below.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {rows.map(({ tag, active }) => (
            <li key={tag.id}>
              <Link
                href={browseHref([tag.id])}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent-soft"
              >
                <List size={18} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate font-medium">{tag.name}</span>
                {active > 0 && <span className="text-sm text-muted">{active}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl border border-border bg-card p-1">
        <NewListButton />
      </div>
    </>
  );
}
