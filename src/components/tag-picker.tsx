"use client";

import * as Popover from "@radix-ui/react-popover";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type PickerTag = { id: string; name: string };

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Height covered by the on-screen keyboard (0 where the layout viewport already shrinks). */
function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const update = () => setInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return inset;
}

/**
 * Chips + autocomplete. Pick an existing tag or type a new name; new names are
 * created server-side when the item is saved.
 *
 * The suggestion list is a Radix Popover (portaled, so a dialog's overflow can
 * never clip it). Focus never leaves the input; ↑/↓ move a highlight, Enter
 * picks it, and Escape closes just the list.
 */
export function TagPicker({
  allTags,
  value,
  onChange,
  placeholder = "Add tag…",
}: {
  allTags: PickerTag[];
  value: string[];
  onChange: (names: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const q = query.trim().replace(/\s+/g, " ");
  const suggestions = allTags.filter(
    (t) =>
      !value.some((v) => same(v, t.name)) && t.name.toLowerCase().includes(q.toLowerCase()),
  );
  const exact = allTags.find((t) => same(t.name, q));
  const canCreate = q.length > 0 && !exact && !value.some((v) => same(v, q));

  // One flat list of options: existing tags, then "New list".
  const options: { key: string; name: string; create: boolean }[] = [
    ...suggestions.map((t) => ({ key: t.id, name: t.name, create: false })),
    ...(canCreate ? [{ key: "__new", name: q, create: true }] : []),
  ];
  const showList = open && options.length > 0;
  const keyboard = useKeyboardInset(showList);

  useEffect(() => setActive(-1), [query]);
  useEffect(() => {
    if (active >= 0) optionRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function add(name: string) {
    const n = name.trim();
    if (n && !value.some((v) => same(v, n))) onChange([...value, n]);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (options.length === 0) return;
      e.preventDefault();
      if (!open) return setOpen(true);
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a < 0 ? (step === 1 ? 0 : options.length - 1) : (a + step + options.length) % options.length));
    } else if (e.key === "Enter" || e.key === ",") {
      if (e.key === "Enter" && active >= 0 && options[active]) {
        e.preventDefault();
        add(options[active].name);
      } else if (q) {
        e.preventDefault();
        add(exact?.name ?? suggestions[0]?.name ?? q);
      }
    } else if (e.key === "Backspace" && !query && value.length) {
      onChange(value.slice(0, -1));
    }
    // Escape is handled by the popover's own layer, so the dialog stays open.
  }

  return (
    <Popover.Root open={showList}>
      <Popover.Anchor asChild>
        <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 md:min-h-10">
          {value.map((name) => (
            <span
              key={name}
              dir="auto"
              className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-xs font-medium text-accent"
            >
              {name}
              <button
                type="button"
                aria-label={`Remove ${name}`}
                className="rounded-full p-0.5 hover:bg-accent/20"
                onClick={() => onChange(value.filter((v) => v !== name))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
            aria-label="Add a list"
            dir="auto"
            value={query}
            placeholder={value.length ? "" : placeholder}
            className="min-w-24 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-muted md:py-1 md:text-sm"
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
          />
        </div>
      </Popover.Anchor>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          avoidCollisions
          collisionPadding={{ top: 8, left: 8, right: 8, bottom: 8 + keyboard }}
          // Focus stays in the input; the list is only ever closed by us.
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={() => setOpen(false)}
          className="z-[60] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border bg-card-strong shadow-xl outline-none"
        >
          <div
            role="listbox"
            id={listId}
            className="max-h-[min(14rem,var(--radix-popper-available-height))] overflow-y-auto overscroll-contain py-1"
          >
            {options.map((o, i) => (
              <button
                key={o.key}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                type="button"
                tabIndex={-1}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm hover:bg-accent-soft md:py-2",
                  o.create && "text-accent",
                  i === active && "bg-accent-soft",
                )}
                // mousedown + preventDefault keeps the input focused (and the phone keyboard up).
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(o.name);
                }}
              >
                {o.create ? <Plus size={14} /> : <TagIcon size={14} className="text-muted" />}
                <span dir="auto" className="min-w-0 flex-1 truncate">
                  {o.create ? <>New list “{o.name}”</> : o.name}
                </span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
