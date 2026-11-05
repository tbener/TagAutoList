# 03 — Item drag & drop: reorder within a list, drop onto a list to tag it

Read `prompts/phase1/00-context.md` first and follow its ground rules. This builds on the dnd-kit setup from prompt 02.

## Part A — Reorder items within a list

### Data

- An item can be in several lists, so **its order is stored per list**: add an integer `position` column to `item_tags` (not null). Moving "Chair" to the top of Shopping must **not** change where it sits in Kid One.
- **Migration backfill:** for each tag, number its existing associations by the item's `createdAt`, **newest first**. That matches today's display order (`newestFirst` in `browse`), so nothing jumps.
- **New associations** go to the **top** of that list. This covers a new item, a tag added while editing, a completed association that gets reactivated, and the drop-to-tag in Part B.
- **Reorder op:** pure op (tagId plus the ordered item ids) → server action → store, with tests.

### Display order

- **Single-list view** (browse path has exactly one tag): items sorted by that tag's `item_tags.position`. Dragging is enabled here.
- **Drilled-down view** (path has two or more tags): sort by the position in the **first tag of the path**, i.e. the list the user came in from. **Dragging is disabled here**, because reordering a filtered subset would be confusing. Show no drag affordance.
- Replace `newestFirst` in `browse` with this rule and update `tree.test.ts` to match.

### Interaction

- Desktop: drag the row, with an activation distance so clicks on checkbox, edit, delete and tag chips still work.
- Phone: drag handle plus a touch sensor with a small press delay, the same pattern as prompt 02. Item reordering **is** enabled on phone.

## Part B — Drop an item onto a list to add that list's tag (desktop only)

- On **desktop**, rows in the sidebar act as drop targets while an item is being dragged. This includes root lists and visible nested sub-branches.
- Dropping an item on a list **adds that tag** to the item at the top of that list's order.
  - If the item already has that tag active: no-op, with a subtle "Already in <list>" hint.
  - If the item has that tag but the association is **completed**: reactivate it. That matches how re-adding a finished tag already works in `updateItem`.
- The item stays where it is in the current view. This **adds** a tag; it doesn't move the item.
- Highlight the drop target clearly while hovering. Show a short confirmation such as "Added to <list>".
- One drag gesture has to tell the two drop zones apart: dropping inside the current item list reorders, and dropping on a sidebar row tags.
- **Phone: disable this completely for now.** There's no sidebar to drop onto (it's a drawer), so only reordering exists on mobile.
- Write a pure op for "add tag to item", or reuse one if a suitable op already exists, with tests.

## Done when

- Reordering in Shopping doesn't affect the order in Kid One, and the order persists across reloads and devices.
- Existing lists keep their current visible order after the migration.
- Drilled-down views follow the entry list's order and can't be dragged.
- Desktop: dropping "Chair" onto "Kid Two" in the sidebar adds the Kid Two tag. The tree and co-occurrence update immediately, and Kid Two now shows up as a sub-branch where it should.
- Phone: reordering works and drop-to-tag isn't offered.
- Typecheck and tests pass.
