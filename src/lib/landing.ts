/** Which screen the app opens on at a cold start. Saved per device, like the theme. */
export type Landing = "up-next" | "last" | "home";

export const LANDING_KEY = "tal-landing";
export const LAST_VIEW_KEY = "tal-last-view";

export function readLanding(): Landing {
  try {
    const v = localStorage.getItem(LANDING_KEY);
    // "my-day" is the option's old value (before the rename): it just means the default.
    return v === "last" || v === "home" ? v : "up-next";
  } catch {
    return "up-next";
  }
}

export function saveLanding(v: Landing) {
  try {
    if (v === "up-next") localStorage.removeItem(LANDING_KEY);
    else localStorage.setItem(LANDING_KEY, v);
  } catch {
    /* storage blocked: the choice just won't persist */
  }
}

/** Only these screens are remembered as "last view". */
export const isRememberable = (path: string) =>
  path === "/" || path === "/up-next" || path === "/browse";

export function rememberView(href: string) {
  try {
    localStorage.setItem(LAST_VIEW_KEY, href);
  } catch {
    /* ignore */
  }
}

/** Where a cold start at "/" should go, or null to stay on Home. */
export function landingTarget(): string | null {
  const pref = readLanding();
  if (pref === "home") return null;
  if (pref === "up-next") return "/up-next";
  try {
    // A last view saved before the rename starts with the old path.
    const last = localStorage.getItem(LAST_VIEW_KEY)?.replace(/^\/my-day(?=$|\?)/, "/up-next");
    const path = last?.split("?")[0] ?? "";
    if (last && isRememberable(path)) return last === "/" ? null : last;
  } catch {
    /* fall through */
  }
  return "/up-next";
}
