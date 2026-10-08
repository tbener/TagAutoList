# TagAutoList

A to-do/list app where **everything is a tag**. A "list" is just a tag with `is_list = true`; items can carry any number of tags, so one item can live in several lists. The browse "tree" isn't stored anywhere — it's computed from which tags co-occur on items.

Phase 1 is implemented per `task-list-app-design-prompt.md`. Deferred (not built): recurrence, search, toggling `is_list`, due dates/reminders, sharing.

## Stack

Next.js (App Router, server actions) · TypeScript · Tailwind v4 + Radix Dialog + lucide icons · Auth.js (Google, JWT sessions) · Postgres via Drizzle ORM · PWA manifest + service worker.

## Setup

1. `npm install`
2. Create a Postgres database (Neon, Supabase, etc.) and a Google OAuth client
   (redirect URI: `http://localhost:3000/api/auth/callback/google`).
3. `copy .env.example .env.local` and fill in the values (`npx auth secret` generates `AUTH_SECRET`).
4. `npm run db:push` to create the tables.
5. `npm run dev` → http://localhost:3000

Other scripts: `npm test` (tree logic), `npm run typecheck`, `npm run build`, `node scripts/make-icons.mjs` (regenerate PWA icons).

## How it works

- **Data model** (`src/db/schema.ts`): `users`, `tags(is_list)`, `items(pinned)`, `item_tags(completed_at)`. No tag↔tag relation.
- **Tree logic** (`src/lib/tree.ts`): pure functions over a per-user snapshot — `browse(path)` returns items having *all* path tags plus co-occurring tags as sub-branches. Unit-tested against the spec's Chair/Table/Lesson example.
- **Completion** is per item↔tag association and is kept for history. Single-tag items complete directly; multi-tag items prompt for which tags. Fully completed items vanish (and unpin). Per-tag history: `/history?tag=…` (with Restore).
- **Tag deletion**: removes the tag from all items; items left with no tags are deleted.
- **Home**: pinned items, then `is_list` tags. Every item shows all its active tags everywhere.
- All mutations are server actions in `src/app/actions.ts`, scoped to the signed-in user.
