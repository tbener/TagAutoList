"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { Snapshot } from "@/lib/tree";
import { AppShell } from "./app-shell";
import { BrowseView } from "./views/browse-view";
import { HistoryView } from "./views/history-view";
import { HomeView } from "./views/home-view";
import { DataProvider } from "./store";

/**
 * The whole signed-in app lives here: one data store, one shell, and views
 * chosen from the URL on the client (so switching lists never hits the server).
 * The route files only exist so deep links and refreshes resolve.
 */
export function AppRoot({ initial, footer }: { initial: Snapshot; footer: ReactNode }) {
  return (
    <DataProvider initial={initial}>
      <Suspense fallback={null}>
        <Shell footer={footer} />
      </Suspense>
    </DataProvider>
  );
}

function Shell({ footer }: { footer: ReactNode }) {
  return (
    <AppShell footer={footer}>
      <Views />
    </AppShell>
  );
}

function Views() {
  const pathname = usePathname();
  const search = useSearchParams();
  if (pathname === "/browse")
    return <BrowseView ids={search.getAll("t")} focus={search.get("focus") === "1"} />;
  if (pathname === "/history") return <HistoryView tagId={search.get("tag")} />;
  return <HomeView />;
}
