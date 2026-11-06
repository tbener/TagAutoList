"use client";

import type { Release } from "@/lib/changelog";
import { APP_VERSION } from "@/lib/app-info";
import { NavLink } from "../nav-link";

/** Renders the parsed CHANGELOG.md (read once on the server, so there's no fetch here). */
export function ChangelogView({ releases }: { releases: Release[] }) {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-accent">What's new</h1>
        <p className="mt-1 text-sm text-muted">
          You have version {APP_VERSION}.{" "}
          <NavLink href="/about" className="text-accent hover:underline">
            About the app
          </NavLink>
        </p>
      </header>

      {releases.length === 0 && <p className="text-muted">No changes recorded yet.</p>}

      {releases.map((r) => (
        <section key={r.version} className="space-y-3">
          <h2 className="flex flex-wrap items-baseline gap-x-3 text-xl font-semibold">
            <span>{r.version}</span>
            {r.date && <span className="text-sm font-normal text-muted">{r.date}</span>}
            {r.version === APP_VERSION && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                Current
              </span>
            )}
          </h2>
          {r.groups.map((g) => (
            <div key={g.title}>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
              <ul className="list-disc space-y-1.5 pl-5 text-[0.95rem] leading-relaxed marker:text-muted">
                {g.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </article>
  );
}
