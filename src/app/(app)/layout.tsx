import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { AppShellBoundary } from "@/components/app-shell";
import { getSnapshot } from "@/lib/data";
import { requireUser } from "@/lib/session";
import { activeItems } from "@/lib/tree";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const snap = await getSnapshot(user.id);
  const items = activeItems(snap);

  return (
    <AppShellBoundary
      tags={snap.tags}
      activeSets={items.map((i) => i.tags.map((t) => t.id))}
      pinnedCount={items.filter((i) => i.pinned).length}
      footer={
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-accent-soft"
          >
            <LogOut size={18} />
            <span className="min-w-0 flex-1 truncate text-left">
              Sign out · {user.name ?? user.email}
            </span>
          </button>
        </form>
      }
    >
      {children}
    </AppShellBoundary>
  );
}
