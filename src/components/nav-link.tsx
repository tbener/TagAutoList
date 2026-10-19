"use client";

import type { AnchorHTMLAttributes } from "react";

/**
 * Client-only navigation. All data is already in the browser, so changing the
 * URL needs no server round trip: we just update history, and Next syncs
 * usePathname/useSearchParams with it.
 */
export function navigate(href: string, opts: { replace?: boolean } = {}) {
  const current = window.location.pathname + window.location.search;
  if (href === current) return;
  if (opts.replace) window.history.replaceState(null, "", href);
  else window.history.pushState(null, "", href);
}

export function NavLink({
  href,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        // Let the browser handle new-tab / modified clicks normally.
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;
        e.preventDefault();
        navigate(href);
      }}
      {...props}
    />
  );
}
