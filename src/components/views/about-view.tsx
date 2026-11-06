"use client";

import { ArrowDownToLine, Copy, GitFork, GripVertical, ListChecks, Mail, Tags } from "lucide-react";
import type { ReactNode } from "react";
import { APP_NAME, APP_TAGLINE, APP_VERSION, CREDITS } from "@/lib/app-info";
import { NavLink } from "../nav-link";

const HOW: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <Tags size={20} />,
    title: "Lists and tasks",
    text: "Create a list, then add tasks to it. To put a task in several lists, add more than one list when you create or edit it.",
  },
  {
    icon: <GitFork size={20} />,
    title: "Drill down",
    text: "Open a list and you'll see related lists: the other lists that share tasks with it. Tap one to see only the tasks that are in both.",
  },
  {
    icon: <ListChecks size={20} />,
    title: "Completing",
    text: "A task in several lists can be completed in just some of them, or in all at once. Each list keeps its own history of what you finished.",
  },
  {
    icon: <GripVertical size={20} />,
    title: "Reordering",
    text: "Drag lists to put them in your order, and drag tasks to order them within a list. On a computer you can also drag a task onto a list in the sidebar to add it there.",
  },
  {
    icon: <Copy size={20} />,
    title: "Duplicating a list",
    text: "Use the \⋯ menu next to a list's title to copy it, with everything still to do, into a new list.",
  },
];

export function AboutView() {
  return (
    <article className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-accent">{APP_NAME}</h1>
        <p className="mt-1 text-muted">{APP_TAGLINE}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">What it is</h2>
        <p className="text-[0.95rem] leading-relaxed">
          In {APP_NAME}, every list is a tag, and a task can live in several lists at once. A
          "Chair" can be in both Shopping and Kid One, and you'll find it in either. There are no
          folders to dig through: lists connect through the tasks they share.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {HOW.map((h) => (
            <li key={h.title} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-1.5 flex items-center gap-2 font-medium text-accent">
                {h.icon}
                <span className="text-fg">{h.title}</span>
              </div>
              <p className="text-sm leading-relaxed text-muted">{h.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium">Version {APP_VERSION}</span>
          <NavLink href="/changelog" className="inline-flex items-center gap-1.5 text-accent hover:underline">
            <ArrowDownToLine size={16} className="-rotate-90" /> See what's new
          </NavLink>
        </p>
        <p className="text-sm text-muted">
          Made by {CREDITS.author}.{" "}
          <a
            href={`mailto:${CREDITS.feedbackEmail}`}
            className="inline-flex items-center gap-1 text-accent hover:underline"
          >
            <Mail size={14} /> Send feedback
          </a>
        </p>
      </section>
    </article>
  );
}
