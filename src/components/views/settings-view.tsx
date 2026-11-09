"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { applyTheme, readTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; hint: string; icon: ReactNode }[] = [
  { value: "light", label: "Light", hint: "Always light", icon: <Sun size={22} /> },
  { value: "dark", label: "Dark", hint: "Always dark", icon: <Moon size={22} /> },
  { value: "auto", label: "Auto", hint: "Match your device", icon: <Monitor size={22} /> },
];

export function SettingsView() {
  const [theme, setTheme] = useState<Theme>("auto");
  useEffect(() => setTheme(readTheme()), []);

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
    </article>
  );
}
