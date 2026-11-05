# 04 — Duplicate a list

Read `prompts/phase1/00-context.md` first and follow its ground rules.

## Goal

Add a "Duplicate" action for a list (tag). It creates a new list that contains copies of the original list's **currently incomplete** items.

## Behavior

- **Where the action lives:** in the list view header, through a small "more" menu (⋯) next to the list title (add the menu if it doesn't exist), and in the same place any other per-list actions such as rename/delete live today. Don't put it on sidebar rows.
- **What gets created:**
  - A new tag named **"<original name> - copy"**. If that name is taken (names are unique per user, case-insensitive), use "<original name> - copy 2", "- copy 3", and so on.
  - Following prompt 02's rule, the new list goes to the **top** of the list order.
  - For every item that has an **active** (not completed) association with the original tag, a **new item** (new id) with the same title and notes. The copy is not linked to the original item; it's a separate item.
  - **Tags on each copy:** the new list, **plus every other tag the original item is still active under** (e.g. Kid One). The original list's own tag is **not** added to the copy. Completed associations aren't copied.
  - So the copies also show up in those other lists. In those lists, each copy is placed **directly after its original item** (prompt 03 positions).
  - Fully completed items are **not** copied.
  - In the new list, the copies keep the original list's item order.
- **Right after duplicating:**
  1. Navigate to the new list.
  2. Put the list title straight into **inline rename mode** with the whole name **selected**, so the user can type over it immediately.
  3. Enter or blur saves. Escape keeps "<name> - copy".
  If inline title editing doesn't exist yet, add it in a way that the normal rename can reuse.
- The whole duplicate is **one pure op** in `ops.ts` (with client-generated ids for the new tag and items) and **one server action** that writes everything in a single transaction. It's optimistic like everything else. Add tests: only incomplete items are copied, the other active tags are carried over (completed ones aren't), the naming collision rule, top position, and order preserved.

## Done when

- Duplicating "Shopping" (5 active items, 3 completed) creates "Shopping - copy" at the top of the lists with 5 new items in the same order, and leaves "Shopping" unchanged.
- If "Chair" was in Shopping and Kid One, the copy of Chair is in Shopping - copy and Kid One (right below the original Chair), not in Shopping.
- You land on the new list with its name selected and ready to rename.
- Duplicating again gives "Shopping - copy 2".
- Typecheck and tests pass.
