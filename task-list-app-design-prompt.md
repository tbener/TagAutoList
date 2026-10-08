# Design Prompt: Tag-Based Task & List App

## Overview

Build a responsive web application for managing tasks and lists. It should feel as simple as a normal to-do app (like Microsoft To Do or Any.do) on the surface, but be powered underneath by a single, unified, flexible tagging system that lets one item live in multiple lists at once.

This is a **phased build**. Implement Phase 1 fully and well before moving to Phase 2. Do not implement recurrence, search, or tag-to-list conversion in Phase 1 — they are explicitly deferred (see "Deferred Features" below).

---

## Core Concept: Everything Is a Tag

There is **one entity type**: the tag. There is no separate "list" entity and no separate "group" or "folder" entity.

- A **tag** has a name and a boolean flag, e.g. `is_list`, marking whether it should be displayed prominently as one of the user's main "lists" in the UI.
- A tag with `is_list = true` is what the user experiences as a normal list (e.g. "Shopping", "Things To Do"). A tag with `is_list = false` is an ad hoc tag (e.g. "Kid One", "Kid Two") used to cross-cut items across lists.
- The `is_list` flag is set once at creation time and is **not toggleable** after creation in Phase 1 (deliberately deferred — see below).
- Tags have **no stored relationship to each other**. There is no parent/child field, no hierarchy table. Tags relate only to items.

## Items

- An **item** represents a task or thing to do/buy.
- An item has: a title, optional notes (plain text), a completion state (see below), and a `pinned` boolean (see "Home Screen" below).
- An item can be associated with **any number of tags** (many-to-many relationship between items and tags).
- When adding tags to an item, the tag input should support standard autocomplete-style behavior: the user can pick from existing tags, or type a new name to create a brand-new tag on the fly if it doesn't already exist.
- Do **not** implement due dates, reminders, priority levels, or subtasks in Phase 1 — explicitly out of scope for now.

## The Dynamic Tree / Navigation Model

This is the most important and distinctive piece of logic. There is no stored hierarchy — the "tree" the user sees is **computed dynamically from item co-occurrence**.

- At the **root** level, the user sees a flat list of all tags where `is_list = true` (their "lists").
- Clicking into a tag shows:
  1. All items directly associated with that tag (that aren't fully completed — see Completion below).
  2. All *other* tags that co-occur on at least one of those items, shown as sub-branches/sibling tags, visually distinct from items (e.g. a different style/icon).
- Clicking one of those co-occurring sub-tags **filters down to the intersection**: only items that have *both* the current tag and the one just clicked.
- This works symmetrically in any direction. E.g. if "Chair" is tagged both "Shopping" and "Kid One", then "Kid One" appears as a sub-branch under "Shopping", AND "Shopping" appears as a sub-branch under "Kid One". There is no true parent/child — just mutual co-occurrence, computed fresh every time.
- A tag only appears as a sub-branch under another tag if at least one item currently has both tags. If no item yet has both "Kid One" and "Kid Two", neither appears nested under the other.

**Worked example to validate against:**
- Item "Chair" → tags: Shopping, Kid One
- Item "Table" → tags: Shopping, Kid Two
- Item "Education Lesson" → tags: Kid One

Clicking "Kid One" at the root should show: items **Chair** and **Education Lesson**, plus a sub-branch for **Shopping** (because Chair co-occurs). It should **not** show "Kid Two" as a sub-branch, since no item currently has both Kid One and Kid Two.

## Completion Logic

Completion is tracked **per item-tag association**, not on the item as a whole.

- If an item has only **one** tag, marking it complete is a single, simple action — it's just done.
- If an item has **multiple** tags, the user must be prompted to indicate which specific tag association(s) they're completing — all of them, or just some. (E.g.: bought one chair, which was needed for both "Kid One" and "Kid Two" — mark only the "Kid One" association complete; the item remains active under "Kid Two" and any other remaining tags.)
- A completed tag-association is **not deleted** — it's marked complete, to preserve history.
- An item is only fully/entirely complete once **all** of its tag associations are marked complete.
- **Completed items/associations must not remain visible with strikethrough styling in the default view** (unlike Microsoft To Do or Google Keep). By default they simply disappear from the active view once complete.
- Provide a way to view completion history per tag (a simple history view is enough for Phase 1 — doesn't need to be fancy).

## Tag Management Page

- Provide a dedicated tag management page, separate from the tree/browse view, that lists **all tags flatly** (not nested).
- For each tag, show: its name, a visible indicator of whether `is_list` is true or false, and options to **rename** or **delete** it.
- Renaming a tag just updates its name; it has no other side effects since tags have no stored relationships to each other.

## Tag Deletion

- Deleting a tag removes that tag from every item that had it.
- If an item had **only** that one tag, the item itself is deleted entirely along with the tag.
- If the item had **other** tags too, it simply loses the deleted tag and survives under its remaining tags.
- (Note for future iteration, not Phase 1: deletion behavior may eventually need to differ depending on where/how the user navigated to the tag they're deleting from — e.g. deleting while viewing a tag nested under another vs. from the root. Not needed now, just keep the code reasonably easy to extend.)

## Home Screen / Pinning

- Every item has a manual boolean `pinned` flag (conceptually like "add to my day", but call it something simple — e.g. "Pin to Home" — independent of which tag(s) the item has).
- The home screen shows all pinned items at the top, regardless of which tag(s) they belong to.
- Below the pinned items, show the regular flat list of the user's tags (where `is_list = true`) to browse into.
- Pinned items stay pinned indefinitely — no automatic daily reset. They're only removed from the pinned section when completed or manually unpinned by the user.
- **Every item, wherever displayed** (home screen, inside a tag view, anywhere), should always show the full list of all tags it's currently associated with.

## Platform & Architecture

- Build as a **single responsive web application** — not separate native apps. It must work well on both a phone browser and a desktop browser from one codebase.
- Make it installable to a phone's home screen (PWA-style: manifest + service worker is enough — doesn't need to be fully offline-capable for Phase 1).
- **Authentication**: implement simple Google sign-in (OAuth). Support multiple user accounts. Each user's tags and items are completely private to them — there is no sharing/collaboration between users in Phase 1.
- **Data storage**: all data (tags, items, associations, completion state, pin state) must live in a real backend database in the cloud — not local-only storage — so the same user's data is identical and in sync whether they're on their phone or their computer.
- Choose a reasonably simple, modern stack that supports this cleanly (e.g. a lightweight Node/TypeScript backend with a hosted Postgres or similar, a React frontend). Use your judgment on specifics, but keep it simple enough for one person to maintain and extend.

## Visual Design

This will be used daily — it should look clean and modern from the start, not bare/unstyled HTML. Use a solid, well-established UI component library (e.g. something like shadcn/ui, Material UI, or similar — your choice) to get a polished look without a separate design pass. Favor clarity and a calm, uncluttered feel over anything flashy.

## Responsive Behavior Notes

- The experience should adapt sensibly between desktop (more screen space, can show more at once) and mobile (compact, prioritize the essentials, use drawers/sheets for secondary panels) — but this doesn't need to be solved in exhaustive detail; use good responsive design judgment.

---

## Deferred Features (explicitly NOT part of Phase 1 — do not build yet, but don't design anything that would make them hard to add later)

- **Recurring tasks**: tasks that reappear after completion, either on a fixed schedule (e.g. every 3 days) or with no schedule, living in a manually-pulled "pool" until reactivated. A pool UI (side panel on desktop, drawer/button on mobile) is planned for later.
- **Search**: finding items/tags by name across the whole app.
- **Toggling** a tag's `is_list` flag after creation (currently set once at creation time only).
- **Due dates / reminders** on items.
- **Sharing/collaboration** between user accounts.

## Suggested Build Order Within Phase 1

1. Data model: users, tags (with `is_list` flag), items, item-tag associations (with per-association completion state), `pinned` flag on items.
2. Google auth + basic account scoping of all data.
3. Core tag/item CRUD: create tags, create items, assign/remove tags on items.
4. The dynamic co-occurrence navigation/tree view (root list → tag view → co-occurring sub-tags → intersection filtering).
5. Completion flow, including the multi-tag "which association(s) are you completing" prompt, and items/associations disappearing from the default view once complete.
6. Home screen with pinned items section + flat list of `is_list` tags below.
7. Polish pass: responsive layout, clean UI component library styling, PWA installability.
