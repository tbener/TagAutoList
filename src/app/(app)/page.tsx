import { Pin } from "lucide-react";
import { ItemRow } from "@/components/item-row";
import { getSnapshot } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { pinnedItems } from "@/lib/tree";

export default async function HomePage() {
  const user = await requireUser();
  const snap = await getSnapshot(user.id);
  const pinned = pinnedItems(snap);

  return (
    <>
      <h1 className="flex items-center gap-2 text-3xl font-semibold text-accent">
        <Pin size={26} /> Pinned
      </h1>
      {pinned.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          <p>
            {snap.tags.length === 0
              ? "Create your first list from the sidebar to get started."
              : "Pick a list on the left to see and add items."}
          </p>
          <p className="mt-1">Items you pin to Home show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {pinned.map((item) => (
            <ItemRow key={item.id} item={item} allTags={snap.tags} />
          ))}
        </ul>
      )}
    </>
  );
}
