"use client";

import { UP_NEXT } from "@/lib/terms";
import { ChevronsRight, Home, Monitor, Moon, Sun, Undo2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { readLanding, saveLanding, type Landing } from "@/lib/landing";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; hint: string; icon: ReactNode }[] = [
  { value: "light", label: "Light", hint: "Always light", icon: <Sun size={22} /> },
  { value: "dark", label: "Dark", hint: "Always dark", icon: <Moon size={22} /> },
  { value: "auto", label: "Auto", hint: "Match your device", icon: <Monitor size={22} /> },
];

const LANDING: { value: Landing; label: string; hint: string; icon: ReactNode }[] = [
  { value: "up-next", label: UP_NEXT.name, hint: UP_NEXT.landingHint, icon: <ChevronsRight size={22} /> },
  { value: "last", label: "Last view", hint: "Where you left off", icon: <Undo2 size={22} /> },
  { value: "home", label: "Home", hint: "Your lists", icon: <Home size={22} /> },
];

export function SettingsView() {
  const [theme, setTheme] = useState<Theme>("auto");
  const [landing, setLanding] = useState<Landing>("up-next");
  useEffect(() => {
    setTheme(readTheme());
    setLanding(readLanding());
  }, []);

  function chooseLanding(l: Landing) {
    setLanding(l);
    saveLanding(l);
  }

  function choose(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  return (
    <article className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-accent">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">
          {OPTIONS.map((o) => {
            const on = theme === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(o.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 bg-card px-2 py-4 text-center transition-colors",
                  on ? "border-accent text-accent" : "border-border text-muted hover:border-accent/50",
                )}
              >
                {o.icon}
                <span className={cn("font-medium", on ? "text-fg" : "")}>{o.label}</span>
                <span className="text-xs">{o.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted">Saved on this device only.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Open the app on</h2>
        <div role="radiogroup" aria-label="Open the app on" className="grid grid-cols-3 gap-3">
          {LANDING.map((o) => {
            const on = landing === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => chooseLanding(o.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border-2 bg-card px-2 py-4 text-center transition-colors",
                  on ? "border-accent text-accent" : "border-border text-muted hover:border-accent/50",
                )}
              >
                {o.icon}
                <span className={cn("font-medium", on ? "text-fg" : "")}>{o.label}</span>
                <span className="text-xs">{o.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted">Saved on this device only.</p>
      </section>
    </article>
  );
}
