"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { Release } from "@/lib/changelog";
import type { Snapshot } from "@/lib/tree";
import { AppShell } from "./app-shell";
import { AboutView } from "./views/about-view";
import { ChangelogView } from "./views/changelog-view";
import { BrowseView } from "./views/browse-view";
import { HistoryView } from "./views/history-view";
import { HomeView } from "./views/home-view";
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

function Views({ releases }: { releases: Release[] }) {
  const pathname = usePathname();
  const search = useSearchParams();
  if (pathname === "/browse")
    return (
      <BrowseView
        ids={search.getAll("t")}
        focus={search.get("focus") === "1"}
        rename={search.get("rename") === "1"}
      />
    );
  if (pathname === "/about") return <AboutView />;
  if (pathname === "/changelog") return <ChangelogView releases={releases} />;
  if (pathname === "/history") return <HistoryView tagId={search.get("tag")} />;
  return <HomeView />;
}
