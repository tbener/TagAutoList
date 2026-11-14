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

  return (
    <>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {today ? today.toLocaleDateString(undefined, { weekday: "long" }) : "My Day"}
          </h1>
          <p className="text-muted">
            {today ? today.toLocaleDateString(undefined, { day: "numeric", month: "long" }) : " "}
          </p>
        </div>
        {items.length > 0 && (
          <Button variant="outline" onClick={() => setPlanning(true)}>
            <Sun size={16} /> Plan my day
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rise rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center">
          <Sun size={28} className="mx-auto mb-3 text-muted" />
          <p className="font-semibold">Nothing in My Day yet.</p>
          <p className="mt-1 text-sm text-muted">Bring up what matters.</p>
          <Button className="mt-4" onClick={() => setPlanning(true)}>
            Plan my day
          </Button>
        </div>
      ) : (
        <SortableLists area="myday" ids={items.map((i) => i.id)}>
          <ul className="space-y-3">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} allTags={snap.tags} sortArea="myday" />
            ))}
          </ul>
        </SortableLists>
      )}

      <PlanMyDay open={planning} onClose={() => setPlanning(false)} />
    </>
  );
}
