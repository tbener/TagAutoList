# TagAutoList

A to-do/list app where **everything is a tag**, shown to the user simply as lists. An item can carry any number of tags, so one item can live in several lists. The sidebar "tree" isn't stored anywhere — it's computed from which tags co-occur on items.

Deferred (not built): recurrence, search, due dates/reminders, sharing, offline mode.

## Stack

Next.js (App Router) · TypeScript · Tailwind v4 + Radix Dialog + lucide icons · Auth.js (Google, JWT sessions) · Postgres via Drizzle ORM (Neon) · PWA manifest + service worker.

## Setup

1. `npm install`
2. Create a Postgres database (Neon etc.) and a Google OAuth client
   (redirect URIs: `http://localhost:3000/api/auth/callback/google` and your production URL's equivalent).
3. `copy .env.example .env.local` and fill in the values (`AUTH_SECRET` can be any long random string).
4. Apply the migrations in `drizzle/` (e.g. `node --env-file=.env.local node_modules/drizzle-kit/bin.cjs push`).
5. `npm run dev` → http://localhost:3000

Other scripts: `npm test`, `npm run typecheck`, `npm run build`, `node scripts/make-icons.mjs` (regenerate PWA icons).

## How it works

- **Data model** (`src/db/schema.ts`): `users`, `tags`, `items`, `item_tags(completed_at)`. No tag↔tag relation. Every tag is a list; `tags.position` is the user's manual order (drag to reorder; new tags go on top).
- **Load once, run from memory.** `(app)/layout.tsx` loads everything the user owns in one go and hands it to `components/store.tsx`. The whole UI (sidebar tree, list views, mobile filter chips, history) is derived from that in the browser, so navigation never waits on the server. Navigation is client-side history updates (`components/nav-link.tsx`); `components/app-root.tsx` picks the view from the URL. The `page.tsx` files are intentionally empty — they only make the URLs resolve on refresh/deep link.
- **Optimistic saving.** Every change is applied locally first (`src/lib/ops.ts`, pure and unit-tested) and saved in the background through an ordered queue calling the server actions in `src/app/actions.ts`. New rows get client-generated ids. If a save fails, the app reloads from the server and shows a notice; it also refreshes when the tab regains focus (picks up changes from other devices).
- **Tree logic** (`src/lib/tree.ts`): pure functions. `browse(path)` = items having *all* path tags; `sidebarModel` builds the tree (every tag is a root; children = tags co-occurring with the whole path; a child that covers every item of its parent is hidden). Nodes show an expand chevron when they have sub-branches.
- **Completion** is per item↔tag association and is kept for history. Single-tag items complete directly; multi-tag items ask which lists. Fully completed items vanish. Per-list history lives at `/history?tag=…` (with Restore).
- **Tag deletion** removes the tag from all items; items left with no tags are deleted.
- **Mobile:** sidebar becomes a drawer; the list view has a chip bar (selected tags to remove, co-occurring tags to add) and an add-task bar pinned to the bottom.
