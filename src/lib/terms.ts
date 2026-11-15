/**
 * THE single source for the name of the "Up Next" feature and every user-facing
 * phrase built from it. Rename it here and nowhere else: components import these,
 * and lib/terms.test.ts fails if the name (or the old one) is hard-coded anywhere in src.
 */
export const UP_NEXT_NAME = "Up Next";

export const UP_NEXT = {
  name: UP_NEXT_NAME,
  /** The route. A route is an address, not wording. */
  href: "/up-next",
  plan: `Plan ${UP_NEXT_NAME}`,
  planDescription: "Tap the tasks to bring to the front. They stay in their lists.",
  add: `Add to ${UP_NEXT_NAME}`,
  remove: `Remove from ${UP_NEXT_NAME}`,
  added: `Added to ${UP_NEXT_NAME}`,
  already: `Already in ${UP_NEXT_NAME}`,
  empty: `Nothing in ${UP_NEXT_NAME} yet.`,
  emptyHint: "Bring up what matters.",
  /** "2 of 5 in Up Next" in the planning sheet. */
  chosen: (chosen: number, total: number) => `${chosen} of ${total} in ${UP_NEXT_NAME}`,
  landingHint: "Your shortlist",
  aboutText: `A hand-picked shortlist that brings your most important tasks to the front. Use the arrow button on any task, drag it onto ${UP_NEXT_NAME} in the sidebar, or use "Plan ${UP_NEXT_NAME}" to pick from all your lists. Tasks stay in their lists and in ${UP_NEXT_NAME} until you remove or finish them; nothing resets. Drag them into your own order. In Settings you can choose which screen the app opens on.`,
} as const;
