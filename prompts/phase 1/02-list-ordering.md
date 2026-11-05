# 02 — Manual list ordering (drag to reorder lists)

Read `prompts/phase 1/00-context.md` first and follow its ground rules.

## Goal

Replace alphabetical ordering of lists with a manual order the user controls by dragging. New lists go to the top.

## Data

- Add an integer `position` column to `tags` (not null).
- **Migration backfill:** for each user, number the existing tags in their current alphabetical order (case-insensitive) so nothing visibly jumps after the migration.
- Add `position` to the client `Tag` type and to the snapshot load.
- **Creating a tag** (through "New list" **or** by typing a new name in the tag picker) puts it at the **top**: its position is lower than every existing tag's. Keep this rule in one place inside `ops.ts`.
- **Reorder op:** a pure op that takes the full new ordered list of tag ids and reassigns positions. The server action persists the new positions in one transaction, scoped to the current user. Add tests for both the ordering and the new-on-top rule.

## Where the order applies

- Sidebar root list (desktop sidebar and mobile drawer).
- The list of lists on the mobile home view.
- Anywhere else the code currently uses `byName` for **lists**: sub-branches/co-occurring tags in the sidebar tree, the chip bar, `tagsWithCounts`. Use position there too, so the order is the same everywhere.
- **Exception:** the small tag chips shown on each item row can keep their current order. Leave those alone.

## Drag to reorder

- Use **dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`). Prompt 03 uses it too, so set it up in a way that can be reused (e.g. one `DndContext` high enough in the app shell for both list and item dragging).
- Only **root-level** lists in the sidebar and drawer can be dragged. Nested sub-branches can't.
- Also make the mobile home "Lists" view reorderable.
- **Desktop:** drag the whole row, with a short activation distance so normal clicks still navigate.
- **Phone/touch:** use a visible drag handle (e.g. a grip icon) with a touch sensor and a small press delay, so scrolling and tapping still work normally.
- Give smooth visual feedback while dragging (a lifted row and a placeholder gap). Saving is optimistic and goes through the existing queue.
- Keyboard-accessible sorting through dnd-kit's keyboard sensor is a plus.

## Done when

- After the migration, lists appear in the same (alphabetical) order as before.
- Dragging a list reorders it everywhere, and the order survives a reload and shows up on another device.
- A new list, whether made with "New list" or created inline from the tag picker, appears at the top.
- Typecheck and tests pass.
