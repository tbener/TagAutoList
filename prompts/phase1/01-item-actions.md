# 01 — Item delete icon + "All" shortcut in the multi-tag picker

Read `prompts/phase1/00-context.md` first and follow its ground rules.

## Goal

Two small UX improvements to item actions. No schema changes.

## 1. Delete icon on each item row

- In `components/item-row.tsx`, add a delete (trash) icon button right next to the existing edit (pencil) button, styled to match it (same size and hit area, muted color, with a danger tint on hover).
- **Item with one active tag:** clicking delete asks for a light confirmation (a small modal: "Delete '<title>'?" with Cancel / Delete), then deletes the item.
- **Item with several active tags:** clicking delete opens the tag picker described in section 2, in "delete" mode.
  - Removing the item from **some** lists removes only those associations. The item stays in the other lists.
  - Removing it from **all** of its active lists deletes the item completely, the same as today's `deleteItem`.
  - The rule is the same as tag deletion: an item that has no associations left is deleted.
- Add a pure op for "remove an item from these tags" in `lib/ops.ts`, plus a matching server action, store wiring and tests. Leave the existing `deleteItem` alone.
- Keep the existing delete option inside the Edit dialog working as it does now.

## 2. "All" shortcut in the multi-tag picker (complete and delete)

Today, completing a multi-tag item opens `CompleteDialog`: you tick lists, then press Complete. Turn this into one shared picker used for both **complete** and **delete**:

- Title and wording change with the mode: "Complete in which lists?" or "Remove from which lists?". In delete mode the confirm button uses the danger style.
- Add a prominent **"All"** button (e.g. "Complete in all lists" / "Delete from all lists"). **One click acts on every active association immediately and closes the dialog**, with no ticking and no second confirm.
- The per-list checkboxes and the regular confirm button stay for partial actions. Remove the existing "Select all / Select none" toggle, because "All" replaces it.
- Keep the current pre-selection behavior (the browse-path tags are pre-checked).
- In delete mode, pre-check nothing. Deletion should be deliberate.

## Done when

- Single-tag item: the trash icon, then confirm, deletes it.
- Multi-tag item: the trash icon opens the picker. Partial removal keeps the item in the other lists, and "All" deletes it in one click.
- Completing a multi-tag item: "All" completes every association in one click.
- Typecheck and tests pass, and the new op has tests.
