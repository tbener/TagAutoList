# 00 — Context & Ground Rules (read this before every prompt in this folder)

This folder holds a series of follow-up prompts for **TagAutoList**. You will be pointed at one prompt at a time (01, 02, …). Do **only** what that prompt asks, then stop and report. This file is background, not a task — don't implement anything from it on its own.

## What the app is

A to-do/list web app where **everything is a tag**. An item can carry any number of tags, so one item can live in several lists at once. There's no stored tag↔tag relationship: the sidebar "tree" is computed from which tags co-occur on items.

The original Phase 1 build is **done and working**. Read `README.md` for how it actually works. The key points:

- **Stack:** Next.js (App Router), TypeScript, Tailwind v4, Radix Dialog, lucide icons, Auth.js (Google), Postgres via Drizzle (Neon), PWA.
- **Next.js version:** read `AGENTS.md` and follow it. This Next.js has breaking changes compared to your training data, so check the bundled docs before you write any Next-specific code.
- **Data model** (`src/db/schema.ts`): `users`, `tags`, `items`, `item_tags(completedAt)`.
- **Load once, run from memory:** `components/store.tsx` holds the whole snapshot for the user. Every view is derived from it on the client.
- **Optimistic saving:** every change goes through a pure function in `src/lib/ops.ts` (unit-tested), is applied locally, then saved in the background through an ordered queue that calls server actions in `src/app/actions.ts`. New rows use client-generated ids. **Every new mutation must follow this same pattern:** a pure op in `ops.ts`, a matching server action, the store wiring, and tests.
- **Tree logic** (`src/lib/tree.ts`): pure functions such as `browse`, `sidebarModel`, `tagsWithCounts` and `activeItems`.
- **Completion** is per item↔tag association (`item_tags.completedAt`) and is kept for history. Single-tag items complete in one click. Multi-tag items open a dialog asking which lists to complete. Fully completed items disappear, and per-list history lives at `/history?tag=…`.
- **Tag deletion** removes the tag from every item. Items left with no tags at all are deleted.
- **Mobile:** the sidebar becomes a drawer, and the list view gets a chip bar and an add-task bar fixed at the bottom.
- **Intentional departures from the original spec:** every tag is a list (the `is_list` flag is being removed in prompt 02), and there's **no** "Pin to Home" feature. Don't add pinning.

## Ground rules for every prompt

1. **The changes are additive, not a rewrite.** Don't restructure or "improve" the existing data model, the tree and co-occurrence logic, the completion semantics, the optimistic-save pipeline, or auth. Touch them only as far as the current prompt needs.
2. **Where the code differs from the original spec, the code wins.** Don't fix differences you notice. Mention them in your report instead.
3. **Schema changes** go through Drizzle: update `schema.ts`, generate a migration into `drizzle/` with `npm run db:generate`, and make sure existing rows get sensible values (backfill inside the migration). Tell me the exact command to apply it.
4. **Keep the pure/impure split.** Logic goes into `lib/ops.ts` and `lib/tree.ts` as pure, tested functions. Components stay thin.
5. **Before reporting done**, run `npm run typecheck` and `npm test`. Add or extend tests for any new op or tree function.
6. **Mobile and desktop both have to work.** Check the layout at phone width.
7. **Don't build deferred features:** recurrence, search, due dates/reminders, sharing, offline mode.
8. **When finished,** give a short report: what changed (files), any migration and how to apply it, decisions you made where the prompt was silent, and anything you noticed but didn't touch.
9. **Version & changelog:** at the end of every prompt, bump the `package.json` version (minor for features, patch for fixes only) and add a matching user-facing entry to `CHANGELOG.md`.
