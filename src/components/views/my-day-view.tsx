"use client";

import { Sun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { myDayItems } from "@/lib/tree";
import { SortableLists } from "../dnd";
import { ItemRow } from "../item-row";
import { PlanMyDay } from "../plan-my-day";
import { useData } from "../store";
import { Button } from "../ui";

/** Weekday and date for the header; set after mount so server and client never disagree. */
function useToday() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    // Roll over at midnight if the app stays open.
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

export function MyDayView() {
  const { snap } = useData();
  const items = useMemo(() => myDayItems(snap), [snap]);
  const [planning, setPlanning] = useState(false);
  const today = useToday();

  // Dawn background for the whole app while this page is open.
  useEffect(() => {
    document.documentElement.dataset.page = "my-day";
    return () => {
      delete document.documentElement.dataset.page;
    };
  }, []);

  return (
    <div className="day-frame -mx-1 p-5 md:mx-0 md:p-9">
      <div aria-hidden className="day-sun" />
      <div className="relative space-y-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold leading-none tracking-tight md:text-5xl">
            {today ? today.toLocaleDateString(undefined, { weekday: "long" }) : "My Day"}
          </h1>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-medium text-day-ink">
            {today ? today.toLocaleDateString(undefined, { day: "numeric", month: "long" }) : " "}
          </p>
        </div>
        {items.length > 0 && (
          <Button
            variant="outline"
            className="border-[var(--day-border)] bg-[var(--day-card)] text-day-ink hover:bg-day-soft"
            onClick={() => setPlanning(true)}
          >
            <Sun size={16} /> Plan my day
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rise rounded-3xl border-2 border-dashed border-[var(--day-border)] p-10 text-center">
          <Sun size={32} className="mx-auto mb-3 text-day" />
          <p className="font-semibold">Nothing in My Day yet.</p>
          <p className="mt-1 text-sm text-muted">Bring up what matters.</p>
          <Button className="bg-day mt-4" onClick={() => setPlanning(true)}>
            Plan my day
          </Button>
        </div>
      ) : (
        <SortableLists area="myday" ids={items.map((i) => i.id)}>
          <ul className="space-y-3.5">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} allTags={snap.tags} sortArea="myday" />
            ))}
          </ul>
        </SortableLists>
      )}

      <PlanMyDay open={planning} onClose={() => setPlanning(false)} />
      </div>
    </div>
  );
}
