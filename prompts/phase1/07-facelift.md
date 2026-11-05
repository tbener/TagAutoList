# 07 — Visual facelift

Read `prompts/phase1/00-context.md` first and follow its ground rules.

## Goal

Give the app its own fresh, modern visual identity. **Use the UI/UX design skill available to you.** It works fine but looks weak, and structurally it resembles Microsoft To Do.

**This is visual and layout work only.** Don't change data, ops, server actions, tree logic, the save pipeline, or behavior. Every feature from prompts 01–06 (delete icon, "All" picker, drag handles, drop targets, duplicate menu, inline rename, Google button, About and Changelog pages, version in the sidebar) has to keep working and be styled as part of the new design. **Exception:** the Google sign-in button follows Google's branding guidelines. Choose its light or dark variant to fit the theme, but don't restyle it.

## Direction

- It must **not** look like Microsoft To Do: avoid the generic blue accent, the big plain title over a flat white list, and the stock sidebar look.
- Any.do can serve as **loose** inspiration for structure and usability. It isn't a template, and the result shouldn't look like Any.do either.
- Aim for usability somewhere between the two, with its own personality: a distinctive palette, considered typography, and a few memorable touches (completion micro-interactions, the drag feel, empty states). It should still be **clean, calm and uncluttered**, not corporate and not flashy.
- It's used every day on a phone and on a desktop, so readability, tap targets and contrast matter. Support both light and dark mode.
- Lists and the dynamic sub-branches (co-occurring tags) are this app's signature concept. The design should make "this item lives in several lists" and the drill-down feel natural and visually clear.

## Process: stop at each checkpoint

**Step 1 — Propose (no app code changes yet).**
Present 2–3 distinct design directions. For each one, give the palette (with hex values, light and dark), the typography (font pairing and scale), shape/spacing/elevation language, iconography, the overall mood in a sentence, and a quick mock of the home screen and one list view. A standalone HTML preview file under `prompts/phase1/design-preview/` is fine. Recommend one. **Stop and wait for my choice.**

**Step 2 — Foundation + Home screen.**
Implement the chosen direction as design tokens: theme variables in `globals.css` and shared primitives in `components/ui.tsx`. Then restyle the **app shell (sidebar/drawer/header) and the home screen**. **Stop and wait for my review.**

**Step 3 — Remaining screens, one at a time.**
In this order: list/browse view (item rows, chip bar, add-task bar, drag states), dialogs (edit, complete/delete picker, confirmations), history view, sign-in page, then PWA manifest colors and icons. **Stop after each screen** for review unless I tell you to continue through.

## Done when

- The app has a coherent, distinctive look across every screen, in light and dark, at phone and desktop widths.
- No behavior changed, and typecheck and tests still pass.
