"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, List, Menu, Pin } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { browseHref, sidebarModel, type Tag, type TreeNode } from "@/lib/tree";
import { NewListButton } from "./list-forms";

type Props = {
  tags: Tag[];
  activeSets: string[][];
  pinnedCount: number;
  footer: ReactNode;
  children: ReactNode;
};

/**
 * Persistent two-pane layout: dynamic list tree on the left (a drawer on
 * phones), content on the right.
 */
export function AppShell({ tags, activeSets, pinnedCount, footer, children }: Props) {
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();

  // Close the drawer after navigating.
  useEffect(() => setDrawer(false), [pathname, search]);

  const sidebar = (
    <Sidebar
      tags={tags}
      activeSets={activeSets}
      pinnedCount={pinnedCount}
      footer={footer}
      path={pathname === "/browse" ? search.getAll("t") : []}
      onHome={pathname === "/"}
    />
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-border bg-card md:block">
        {sidebar}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-card/90 px-2 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Open lists"
            onClick={() => setDrawer(true)}
            className="rounded-md p-2 hover:bg-accent-soft"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold tracking-tight">
            Tag<span className="text-accent">Auto</span>List
          </span>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-xs bg-card shadow-xl outline-none md:hidden"
          >
            <Dialog.Title className="sr-only">Lists</Dialog.Title>
            {sidebar}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function Sidebar({
  tags,
  activeSets,
  pinnedCount,
  footer,
  path,
  onHome,
}: Omit<Props, "children"> & { path: string[]; onHome: boolean }) {
  const roots = useMemo(() => sidebarModel(tags, activeSets, path), [tags, activeSets, path.join(",")]);

  return (
    <div className="flex h-full flex-col">
      <Link href="/" className="px-5 pb-3 pt-5 text-lg font-semibold tracking-tight">
        Tag<span className="text-accent">Auto</span>List
      </Link>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        <Row href="/" selected={onHome} icon={<Pin size={18} />} count={pinnedCount}>
          Pinned
        </Row>
        <div className="mx-3 my-2 border-t border-border" />
        {roots.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted">No lists yet.</p>
        )}
        {roots.map((node) => (
          <TreeItem key={node.tag.id} node={node} depth={0} />
        ))}
      </nav>

      <div className="space-y-1 border-t border-border p-2">
        <NewListButton />
        {footer}
      </div>
    </div>
  );
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const expanded = node.children.length > 0;
  return (
    <div>
      <Row
        href={browseHref(node.path)}
        selected={node.selected}
        icon={
          expanded ? <ChevronRight size={18} className="rotate-90" /> : <List size={18} />
        }
        count={node.count}
        depth={depth}
      >
        {node.tag.name}
      </Row>
      {expanded && (
        <div className="ml-5 border-l border-border pl-1">
          {node.children.map((c) => (
            <TreeItem key={c.tag.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  href,
  selected,
  icon,
  count,
  children,
  depth = 0,
}: {
  href: string;
  selected: boolean;
  icon: ReactNode;
  count: number;
  children: ReactNode;
  depth?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent-soft",
        selected && "bg-accent-soft font-semibold text-accent",
        depth > 0 && "py-1.5",
      )}
    >
      <span className={cn("shrink-0", !selected && "text-muted")}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count > 0 && <span className="text-xs text-muted">{count}</span>}
    </Link>
  );
}

/** Wrapper needed because the shell reads search params on the client. */
export function AppShellBoundary(props: Props) {
  return (
    <Suspense fallback={null}>
      <AppShell {...props} />
    </Suspense>
  );
}
