import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RestoreButton } from "@/components/restore-button";
import { getSnapshot } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { history } from "@/lib/tree";

export const metadata = { title: "History" };

const fmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const user = await requireUser();
  const { tag: tagId } = await searchParams;
  const snap = await getSnapshot(user.id);
  const tag = snap.tags.find((t) => t.id === tagId);
  if (!tag) redirect("/tags");

  const entries = history(snap, tag.id);

  return (
    <>
      <div>
        <Link href={`/browse?t=${tag.id}`} className="flex items-center gap-1 text-sm text-muted hover:text-fg">
          <ChevronLeft size={14} /> {tag.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">History · {tag.name}</h1>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          Nothing completed in this list yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={`${e.itemId}-${e.completedAt.getTime()}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.title}</p>
                <p className="text-xs text-muted">{fmt.format(e.completedAt)}</p>
              </div>
              <RestoreButton itemId={e.itemId} tagId={tag.id} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
