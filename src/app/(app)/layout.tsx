import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { AppRoot } from "@/components/app-root";
import { getSnapshot } from "@/lib/data";
import { requireUser } from "@/lib/session";

/**
 * Loads everything the user owns once and hands it to the client, which then
 * runs the whole app from memory. The pages below only exist so URLs resolve;
 * the client picks the view (see components/app-root.tsx).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  void children;
  const user = await requireUser();
  const snap = await getSnapshot(user.id);

  return (
    <AppRoot
      initial={snap}
      footer={
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[0.95rem] text-muted hover:bg-accent-soft"
          >
            <LogOut size={20} />
            <span className="min-w-0 flex-1 truncate text-left">
              Sign out · {user.name ?? user.email}
            </span>
          </button>
        </form>
      }
    />
  );
}
