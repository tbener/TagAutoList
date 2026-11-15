# Changelog

All notable changes to TagAutoList, newest first. The format follows [Keep a Changelog](https://keepachangelog.com).

## [0.1.10] — 2026-11-15

### Added
- A new Up Next shortlist: bring your most important tasks to the front from any list. Tasks stay there until you remove or finish them. Nothing resets overnight and nothing is added for you.
- Add a task to Up Next with the arrow button on any task, by dragging it onto Up Next in the sidebar (desktop), or from "Plan Up Next", a picker that lists every list so you can tick the tasks to bring up. Up Next sits at the top of the sidebar, the menu and the phone Lists screen, and you can drag its tasks into your own order.
- Finishing a task completely removes it from Up Next. Finishing it in only some of its lists keeps it there. Removing a task from Up Next never completes it.
- In Settings, "Open the app on" lets you choose which screen the app starts on: Up Next (the default), the last view you were on, or Home. It is remembered on this device.

## [0.1.9] — 2026-11-14

### Added
- A new "Only this list" switch above a list's tasks hides the tasks that are also in other lists, so you see just what belongs to that list alone. It shows how many are hidden, is remembered for each list on this device, and turns off dragging while it is on.
- Lists can now be nested under another list from the ⋯ menu next to the title ("Nest under…" / "Change parent…"). A nested list leaves the top level (sidebar, menu and Lists screen) and shows only under its parent, even when it is empty. Moving it back to the top level puts it at the top, and deleting the parent brings its nested lists back to the top level.
- The About page describes both.

## [0.1.8] — 2026-11-10

### Fixed
- The list suggestions when editing a task's lists are no longer cut off at the bottom of the dialog. They float above it, flip upward when there is no room below, scroll when there are many, and show every matching list.
- You can pick a suggestion with the arrow keys and Enter, and Escape closes only the suggestions, not the dialog.
- Hebrew list names now display and align correctly in the suggestions and chips.
- Removed the database "SECURITY WARNING" about sslmode that showed up as an error in the dev console. The connection behaves exactly as before.

## [0.1.7] — 2026-11-09

### Added
- A Settings page (link at the bottom of the sidebar) with a theme choice: Light, Dark or Auto (follows your device). It is remembered on this device.
- Checking a task off now plays a short animation, and tasks, sheets and messages ease in with a gentle spring.
- A friendlier empty state for lists with nothing to do.

### Changed
- A completely new look, "Aurora Glass": frosted-glass cards, sidebar and top bar over a soft glowing background, in a pearly lavender light mode and a deep indigo night mode, with indigo-to-orchid action buttons and the Sora font for titles.
- The install colours (browser bar and splash screen) match the new look.

## [0.1.6] — 2026-11-06

### Added
- An About page explaining how TagAutoList works, with a way to send feedback.
- This changelog, and the app version shown at the bottom of the sidebar.

## [0.1.5] — 2026-11-06

### Changed
- The sign-in button is now the official "Continue with Google" button, in a light or dark style to match your device.
- Signing in shows a small spinner while it works.

## [0.1.4] — 2026-11-06

### Added
- Duplicate a list from the "⋯" menu next to its title. You get a "<name> - copy" at the top of your lists with copies of everything still to do, which also show up in the other lists the originals belong to.
- Rename a list right on its title: the name is selected so you can just type over it. Press Enter to save or Escape to keep the old name.

### Changed
- Renaming a list no longer opens a pop-up.

## [0.1.3] — 2026-11-06

### Added
- Drag tasks to put them in your own order within a list. Each list keeps its own order, so moving a task in one list doesn't move it in another.
- On a computer, drag a task onto a list in the sidebar to add it to that list as well.
- New tasks, and tasks you add to another list, now start at the top of that list.

### Changed
- When you drill down into several lists, tasks follow the order of the list you started from.

## [0.1.2] — 2026-11-06

### Added
- Drag lists to reorder them in the sidebar, the drawer and the Lists screen on your phone. New lists appear at the top.

### Changed
- Lists are no longer sorted alphabetically; they stay in the order you give them.

## [0.1.1] — 2026-11-06

### Added
- A delete (trash) button on every task. For a task in several lists you choose which lists to remove it from, or delete it everywhere.
- A one-tap "Complete in all lists" / "Delete from all lists" button when a task is in several lists.

### Removed
- The "Select all / Select none" toggle in the list picker, replaced by the new one-tap button.

## [0.1.0] — 2026-10-19

### Added
- The first version of TagAutoList: everything is a tag, so a task can live in several lists at once.
- Open a list to see related lists and narrow down to the tasks in both.
- Complete tasks in one list or several, with a history for every list.
- Works on your phone and your computer, signs in with Google, and saves in the background so it feels instant.
