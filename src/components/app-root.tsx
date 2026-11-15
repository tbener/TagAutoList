"use client";

import { UP_NEXT } from "@/lib/terms";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { isRememberable, landingTarget, rememberView } from "@/lib/landing";
import type { Release } from "@/lib/changelog";
import type { Snapshot } from "@/lib/tree";
import { AppShell } from "./app-shell";
import { AboutView } from "./views/about-view";
import { ChangelogView } from "./views/changelog-view";
import { BrowseView } from "./views/browse-view";
import { UpNextView } from "./views/up-next-view";
import { HistoryView } from "./views/history-view";
import { SettingsView } from "./views/settings-view";
import { HomeView } from "./views/home-view";
import { navigate } from "./nav-link";
import { DataProvider } from "./store";

/**
 * The whole signed-in app lives here: one data store, one shell, and views
 * chosen from the URL on the client (so switching lists never hits the server).
 * The route files only exist so deep links and refreshes resolve.
 */
export function AppRoot({
  initial,
  footer,
  releases,
}: {
  initial: Snapshot;
  footer: ReactNode;
  releases: Release[];
}) {
  return (
    <DataProvider initial={initial}>
      <Suspense fallback={null}>
        <Shell footer={footer} releases={releases} />
      </Suspense>
    </DataProvider>
  );
}

function Shell({ footer, releases }: { footer: ReactNode; releases: Release[] }) {
  return (
    <AppShell footer={footer}>
      <Views releases={releases} />
    </AppShell>
  );
}

/**
 * Module-level on purpose (not session storage): it describes this page load.
 * undefined = not decided yet; a string = a cold start at "/" is being sent there.
 */
let coldTarget: string | null | undefined;

function Views({ releases }: { releases: Release[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();
  // At "/" nothing is drawn until we know whether this cold start redirects (no Home flash).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (coldTarget === undefined) coldTarget = pathname === "/" ? landingTarget() : null;
    if (pathname !== "/") coldTarget = null; // the redirect (or a deep link) has landed
    if (pathname === "/" && coldTarget) {
      navigate(coldTarget, { replace: true });
      return;
    }
    if (isRememberable(pathname)) rememberView(pathname + (query ? `?${query}` : ""));
    setReady(true);
  }, [pathname, query]);

  if (pathname === "/" && !ready) return null;
  if (pathname === "/browse")
    return (
      <BrowseView
        ids={search.getAll("t")}
        focus={search.get("focus") === "1"}
        rename={search.get("rename") === "1"}
      />
    );
  if (pathname === UP_NEXT.href) return <UpNextView />;
  if (pathname === "/settings") return <SettingsView />;
  if (pathname === "/about") return <AboutView />;
  if (pathname === "/changelog") return <ChangelogView releases={releases} />;
  if (pathname === "/history") return <HistoryView tagId={search.get("tag")} />;
  return <HomeView />;
}
