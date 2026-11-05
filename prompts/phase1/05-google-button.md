# 05 — Proper Google sign-in button

Read `prompts/phase1/00-context.md` first and follow its ground rules.

## Goal

The sign-in page (`src/app/signin/page.tsx`) currently uses the app's generic `Button` with the plain text "Continue with Google". Replace it with a proper **Google-branded sign-in button**.

## Requirements

- Follow **Google's Sign-In branding guidelines** (Google Identity "Sign in with Google" branding):
  - The official multicolor **"G" logo**, as an inline SVG with Google's exact colors and proportions. No icon library and no approximation.
  - Label: **"Continue with Google"**.
  - Use the standard variants: **light** (white background, gray `#747775` border, `#1F1F1F` text) and **dark** (`#131314` background, `#8E918F` border, `#E3E3E3` text). Pick the variant from the user's color scheme (`prefers-color-scheme`).
  - Pill/rounded shape, the correct logo-to-text spacing, and a minimum height of 40px. Font: Roboto Medium if it's easy to load; otherwise use the app font at medium weight.
  - Hover, focus-visible and pressed states, as described in the guidelines.
- Make it a reusable component (e.g. `components/google-button.tsx`) that renders a normal `type="submit"` button, so the existing server-action form and `signIn("google")` flow stay **exactly** as they are.
- Show a pending state while signing in: disabled, with a subtle spinner in place of the logo, using `useFormStatus` or the equivalent for this Next/React version.
- Full width inside the sign-in card, and it has to look right on a phone.
- Don't change auth configuration or behavior.

## Done when

- The sign-in page shows a button that's recognizably Google's official style, in light and dark.
- Signing in works exactly as before.
- Typecheck passes.
