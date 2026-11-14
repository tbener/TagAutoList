"use client";

import { Check, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { browse, nestedTags, rootTags, sortTags } from "@/lib/tree";
import { cn } from "@/lib/utils";
import { useData } from "./store";
import { Button, Modal } from "./ui";

/**
 * "Plan my day": every list as a collapsible section (sidebar order, nested lists
 * right after their parent). Tapping a task toggles it in My Day at once.
 */
export function PlanMyDay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { snap, addToMyDay, removeFromMyDay } = useData();
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const sections = useMemo(() => {
    const order = sortTags(rootTags(snap.tags)).flatMap((t) => [t, ...nestedTags(snap.tags, t.id)]);
    return order.map((tag) => ({ tag, nested: !!tag.parentId, items: browse(snap, [tag.id]).items }));
  }, [snap]);

  const toggleSection = (id: string) =>
    setOpened((s) => {
      const next = new Set(s);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Plan my day"
      description="Tap the tasks to bring to the front. They stay in their lists."
      tall
    >
      <div className="space-y-1.5">
        {sections.length === 0 && <p className="py-6 text-center text-sm text-muted">No lists yet.</p>}
        {sections.map(({ tag, nested, items }) => {
          const isOpen = opened.has(tag.id);
          const chosen = items.filter((i) => i.myDayPosition !== null).length;
          return (
            <section key={tag.id} className={cn(nested && "ml-5")}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleSection(tag.id)}
                className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-start hover:bg-accent-soft"
              >
                <ChevronRight size={18} className={cn("shrink-0 text-muted transition-transform", isOpen && "rotate-90")} />
                <span dir="auto" className="min-w-0 flex-1 truncate font-medium">
                  {tag.name}
                </span>
                <span className="shrink-0 text-xs text-muted">
                  {items.length === 0 ? "empty" : chosen > 0 ? `${chosen} of ${items.length} in My Day` : items.length}
                </span>
              </button>
              {isOpen && (
                <ul className="mb-1 ml-4 border-l border-border pl-1">
                  {items.length === 0 && <li className="px-3 py-2 text-sm text-muted">Nothing to do here.</li>}
                  {items.map((i) => {
                    const on = i.myDayPosition !== null;
                    return (
                      <li key={i.id}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={on}
                          onClick={() => (on ? removeFromMyDay(i.id) : addToMyDay(i.id))}
                          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-start hover:bg-accent-soft"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors",
                              on ? "border-transparent bg-cta text-cta-fg" : "border-muted/60 text-transparent",
                            )}
                          >
                            <Check size={14} strokeWidth={3} />
                          </span>
                          <span dir="auto" className="min-w-0 flex-1 break-words text-[0.95rem]">
                            {i.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      <div className="sticky bottom-0 -mx-5 mt-4 flex justify-end px-5 pt-2">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
