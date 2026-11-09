"use client";

import { listStyle } from "@/lib/list-color";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronRight, Menu } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { APP_VERSION } from "@/lib/app-info";
import { cn } from "@/lib/utils";
import { activeItems, browseHref, nodeKey, pathKeys, sidebarModel, type TreeNode } from "@/lib/tree";
import { AppDnd, SortableLists, SortableRow, useTagDrop } from "./dnd";
import { NewListButton } from "./list-forms";
import { NavLink } from "./nav-link";
import { useData } from "./store";

/**
 * Persistent two-pane layout: dynamic tag tree on the left (a drawer on
 * phones), content on the right.
 */
export function AppShell({ footer, children }: { footer: ReactNode; children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const { pending, notice, toast } = useData();
  const pathname = usePathname();
  const search = useSearchParams();

  const pathStr = pathname === "/browse" ? search.getAll("t").join(",") : "";
  const path = useMemo(() => (pathStr ? pathStr.split(",") : []), [pathStr]);

  // Close the drawer after navigating.
  useEffect(() => setDrawer(false), [pathname, search]);

  return (
    <AppDnd>
    <div className="flex min-h-dvh">
      <aside className="glass sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-border md:block">
        <Sidebar area="desk" footer={footer} path={path} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border px-2 md:hidden">
          <button
            type="button"
            aria-label="Open lists"
            onClick={() => setDrawer(true)}
            className="rounded-xl p-2.5 hover:bg-accent-soft"
          >
            <Menu size={22} />
          </button>
          <NavLink href="/" className="text-lg font-semibold tracking-tight">
            Tag<span className="text-accent">Auto</span>List
          </NavLink>
          {pending > 0 && <span className="ml-auto pr-2 text-xs text-muted">Saving…</span>}
        </header>
        {/* Extra bottom padding on phones keeps the last item clear of the fixed add-task bar. */}
        <main className="mx-auto max-w-3xl space-y-6 px-4 pb-32 pt-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>

      {notice && (
        <div
          role="status"
          className="fixed inset-x-3 top-3 z-50 mx-auto max-w-md rounded-xl bg-danger px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          {notice}
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="rise fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-fg px-4 py-2.5 text-sm font-medium text-bg shadow-lg md:bottom-6"
        >
          {toast}
        </div>
      )}

      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay-in fixed inset-0 z-40 bg-[#0a1424]/45 backdrop-blur-[2px] md:hidden" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm bg-card shadow-xl outline-none md:hidden"
          >
            <Dialog.Title className="sr-only">Lists</Dialog.Title>
            <Sidebar area="drawer" footer={footer} path={path} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
    </AppDnd>
  );
}

/**
 * `area` keeps the desktop sidebar and the phone drawer (both can be mounted)
 * apart for drag-and-drop. Desktop drags the whole row; the drawer uses a grip.
 */
function Sidebar({
  area,
  footer,
  path,
}: {
  area: "desk" | "drawer";
  footer: ReactNode;
  path: string[];
}) {
  const { snap } = useData();
  const pathKey = path.join(",");

  const activeSets = useMemo(
    () => activeItems(snap).map((i) => i.tags.map((t) => t.id)),
    [snap],
  );

  // Which nodes are open. Selecting something always opens the way to it.
  const [expanded, setExpanded] = useState<Set<string>>(() => pathKeys(path));
  useEffect(() => {
    setExpanded((prev) => new Set([...prev, ...pathKeys(path)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathKey]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const roots = useMemo(
    () => sidebarModel(snap.tags, activeSets, path, expanded),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snap.tags, activeSets, pathKey, expanded],
  );

  return (
    <div className="flex h-full flex-col">
      <NavLink href="/" className="px-5 pb-3 pt-5 text-xl font-semibold tracking-tight">
        Tag<span className="text-accent">Auto</span>List
      </NavLink>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {roots.length === 0 && <p className="px-3 py-2 text-sm text-muted">No lists yet.</p>}
        <SortableLists area={area} ids={roots.map((r) => r.tag.id)}>
          {roots.map((node) => (
            <SortableRow
              key={node.tag.id}
              area={area}
              tagId={node.tag.id}
              name={node.tag.name}
              rowDrag={area === "desk"}
            >
              {(grip) => (
                <TreeItem
                  node={node}
                  expanded={expanded}
                  onToggle={toggle}
                  grip={grip}
                  drop={area === "desk"}
                />
              )}
            </SortableRow>
          ))}
        </SortableLists>
      </nav>

      <div className="space-y-1 border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <NewListButton />
        {footer}
        <div className="flex items-center justify-between px-3 pt-1 text-xs text-muted">
          <span className="flex gap-4">
            <NavLink href="/settings" className="rounded-md py-1 hover:text-fg">
              Settings
            </NavLink>
            <NavLink href="/about" className="rounded-md py-1 hover:text-fg">
              About
            </NavLink>
          </span>
          <NavLink href="/changelog" title="What's new" className="rounded-md py-1 hover:text-fg">
            v{APP_VERSION}
          </NavLink>
        </div>
      </div>
    </div>
  );
}

function TreeItem({
  node,
  expanded,
  onToggle,
  grip,
  drop = false,
}: {
  node: TreeNode;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  /** Reorder handle — only root-level lists get one. */
  grip?: ReactNode;
  /** Desktop sidebar: this row accepts a dragged item (adds this tag to it). */
  drop?: boolean;
}) {
  const key = nodeKey(node.path);
  const open = expanded.has(key);
  const target = useTagDrop(key, node.tag.id, drop);
  return (
    <div>
      <div
        ref={target.setNodeRef}
        className={cn(
          "flex items-center rounded-xl hover:bg-accent-soft",
          node.selected && "bg-accent-soft text-accent",
          target.target && "ring-1 ring-accent/30",
          target.over && "bg-cta-soft text-cta ring-2 ring-cta",
        )}
      >
        <button
          type="button"
          aria-label={open ? `Collapse ${node.tag.name}` : `Expand ${node.tag.name}`}
          aria-expanded={node.expandable ? open : undefined}
          disabled={!node.expandable}
          onClick={() => onToggle(key)}
          className="grid size-10 shrink-0 place-items-center text-muted disabled:pointer-events-none"
        >
          {node.expandable && (
            <ChevronRight size={18} className={cn("transition-transform", open && "rotate-90")} />
          )}
        </button>
        <NavLink
          href={browseHref(node.path)}
          aria-current={node.selected ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-3 text-[0.95rem]",
            node.selected && "font-semibold",
          )}
        >
          <span style={listStyle(node.tag.id)} className="lc-dot size-2.5 shrink-0 rounded-full" />
          <span className="min-w-0 flex-1 truncate">{node.tag.name}</span>
          {node.count > 0 && <span className="text-xs text-muted">{node.count}</span>}
        </NavLink>
        {grip}
      </div>
      {open && node.children.length > 0 && (
        <div className="ml-5 border-l border-border pl-1">
          {node.children.map((c) => (
            <TreeItem key={c.tag.id} node={c} expanded={expanded} onToggle={onToggle} drop={drop} />
          ))}
        </div>
      )}
    </div>
  );
}
