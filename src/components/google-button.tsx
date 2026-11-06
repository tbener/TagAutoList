"use client";

import { useFormStatus } from "react-dom";

/**
 * "Continue with Google" button following Google's Sign-In branding guidelines:
 * the official multicolor "G", pill shape, 40px minimum height, and the
 * standard light (white / #747775 / #1F1F1F) and dark (#131314 / #8E918F /
 * #E3E3E3) variants, picked from the user's color scheme. Hover, focus and
 * pressed states are the guidelines' state-layer overlays (8% / 12% / 12%).
 *
 * Renders a plain submit button, so it works inside any `<form action>`.
 */
export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={[
        "group relative inline-flex min-h-10 w-full items-center justify-center gap-2.5 overflow-hidden rounded-full border px-3",
        "text-sm font-medium tracking-[0.25px] transition-shadow",
        // light variant
        "border-[#747775] bg-white text-[#1F1F1F]",
        // dark variant
        "dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[#0B57D0] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:focus-visible:ring-[#A8C7FA]",
        "disabled:cursor-default disabled:opacity-60",
      ].join(" ")}
    >
      {/* state layer: 8% on hover, 12% on focus/press */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#303030] opacity-0 transition-opacity group-hover:opacity-[0.08] group-focus-visible:opacity-[0.12] group-active:opacity-[0.12] group-disabled:hidden dark:bg-[#E3E3E3]"
      />
      {pending ? <Spinner /> : <GoogleG />}
      <span className="relative truncate">{label}</span>
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="relative size-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent opacity-60"
    />
  );
}

/** Google's official "G" mark (multicolor), unmodified proportions. */
function GoogleG() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className="relative size-5 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}
