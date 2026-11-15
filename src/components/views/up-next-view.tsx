"use client";

import { UP_NEXT } from "@/lib/terms";
import { ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { upNextItems } from "@/lib/tree";
import { SortableLists } from "../dnd";
import { ItemRow } from "../item-row";
import { PlanUpNext } from "../plan-up-next";
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

export function UpNextView() {
  const { snap } = useData();
  const items = useMemo(() => upNextItems(snap), [snap]);
  const [planning, setPlanning] = useState(false);
  const today = useToday();

  // Dawn background for the whole app while this page is open.
  useEffect(() => {
    document.documentElement.dataset.page = "up-next";
    return () => {
      delete document.documentElement.dataset.page;
    };
  }, []);

  return (
    <div className="day-frame -mx-1 p-5 md:mx-0 md:p-9">
      <div aria-hidden className="day-rings" />
      <div className="relative space-y-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold leading-none tracking-tight md:text-5xl">
            {today ? today.toLocaleDateString(undefined, { weekday: "long" }) : UP_NEXT.name}
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
            <ArrowUp size={16} /> {UP_NEXT.plan}
          </Button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="rise rounded-3xl border-2 border-dashed border-[var(--day-border)] p-10 text-center">
          <ArrowUp size={36} className="mx-auto mb-3 text-day" />
          <p className="font-semibold">{UP_NEXT.empty}</p>
          <p className="mt-1 text-sm text-muted">{UP_NEXT.emptyHint}</p>
          <Button className="bg-day mt-4" onClick={() => setPlanning(true)}>
            {UP_NEXT.plan}
          </Button>
        </div>
      ) : (
        <SortableLists area="upnext" ids={items.map((i) => i.id)}>
          <ul className="space-y-3.5">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} allTags={snap.tags} sortArea="upnext" />
            ))}
          </ul>
        </SortableLists>
      )}

      <PlanUpNext open={planning} onClose={() => setPlanning(false)} />
      </div>
    </div>
  );
}
