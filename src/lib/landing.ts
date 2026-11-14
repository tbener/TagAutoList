/** Which screen the app opens on at a cold start. Saved per device, like the theme. */
export type Landing = "my-day" | "last" | "home";

export const LANDING_KEY = "tal-landing";
export const LAST_VIEW_KEY = "tal-last-view";

export function readLanding(): Landing {
  try {
    const v = localStorage.getItem(LANDING_KEY);
    return v === "last" || v === "home" ? v : "my-day";
  } catch {
    return "my-day";
  }
}

export function saveLanding(v: Landing) {
  try {
    if (v === "my-day") localStorage.removeItem(LANDING_KEY);
    else localStorage.setItem(LANDING_KEY, v);
  } catch {
    /* storage blocked: the choice just won't persist */
  }
}

/** Only these screens are remembered as "last view". */
export const isRememberable = (path: string) =>
  path === "/" || path === "/my-day" || path === "/browse";

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
  if (pref === "my-day") return "/my-day";
  try {
    const last = localStorage.getItem(LAST_VIEW_KEY);
    const path = last?.split("?")[0] ?? "";
    if (last && isRememberable(path)) return last === "/" ? null : last;
  } catch {
    /* fall through */
  }
  return "/my-day";
}
