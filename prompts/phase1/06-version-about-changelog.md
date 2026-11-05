# 06 — App version, About page, Changelog

Read `prompts/phase1/00-context.md` first and follow its ground rules.

## 1. Version

- The **single source of truth** is `version` in `package.json` (semantic versioning).
- Expose it to the app at build time, e.g. through `next.config.ts` `env` or by importing `package.json` in a small `lib/version.ts`. Keep it in one place, and don't hardcode the version anywhere else.
- **Show it:**
  - In the **sidebar footer** (desktop sidebar and mobile drawer) as small muted text, e.g. `v0.6.0`. Clicking it opens the Changelog page.
  - On the **About page** (see below).
- **Starting version:** Phase 1 counts as `0.1.0`. Each completed prompt in `prompts/phase1/` (01–05, plus this one) counts as a minor bump. Check `git log` to see which prompts were actually implemented, and set `package.json` to match. If 01–06 are all done, that's `0.7.0`.

## 2. Changelog

- Create `CHANGELOG.md` at the repo root, in the [Keep a Changelog](https://keepachangelog.com) format. Newest entry first, with `## [x.y.z] — YYYY-MM-DD` headings and `Added` / `Changed` / `Fixed` / `Removed` groups.
- **Write for the user, not the developer:** short, plain-language lines about what changed in the app ("You can now drag lists to reorder them"). Leave out file names and internals.
- **Backfill** entries for 0.1.0 (the initial release, summarized in a few lines) and for each prompt already implemented. Base them on `git log` and the prompt files, with dates taken from the commits.
- **In-app page:** add a `/changelog` route inside the authenticated app layout that renders `CHANGELOG.md` read at build time on the server, so there's no runtime fetch. Use a small, well-maintained markdown renderer (e.g. `react-markdown`) or a tiny dedicated parser, your choice; keep it light. Style it so it's comfortable to read on phone and desktop.

## 3. About page

Add an `/about` route inside the app layout, linked from the sidebar footer next to the version. Contents:

1. **App name + one-line tagline** (reuse "Everything is a tag. Simple lists on top.").
2. **What it is:** a short paragraph on the idea. Every list is a tag, and an item can live in several lists at once.
3. **How it works:** a short, scannable guide (a few bullet points or small cards) covering:
   - Creating lists and items, and adding an item to several lists.
   - Drill-down: opening a list shows related lists (other lists that share items with it), and tapping one filters to the items in both.
   - Completing: an item in several lists can be completed in just some of them or all at once, and history is kept per list.
   - Reordering lists and items by dragging, and on desktop, dragging an item onto a list in the sidebar to add it there.
   - Duplicating a list.
   Only describe features that actually exist in the code at this point.
4. **Version**, plus a link to the **Changelog** page.
5. **Credits / contact:** "Made by Tal Bener", with a `mailto:` link to `tbener@gmail.com` labeled "Send feedback". Keep these values in one obvious constant so they're easy to change.

## 4. Process rule from now on

Add this to the ground rules in `prompts/phase1/00-context.md` (append it as rule 9):

> 9. **Version & changelog:** at the end of every prompt, bump the `package.json` version (minor for features, patch for fixes only) and add a matching user-facing entry to `CHANGELOG.md`.

## Done when

- The sidebar footer shows the current version, and it links to the changelog.
- `/about` and `/changelog` work on phone and desktop and are reachable from the sidebar and drawer.
- `CHANGELOG.md` has backfilled entries, and the version matches `package.json`.
- Rule 9 has been added to `00-context.md`.
- Typecheck and tests pass.
