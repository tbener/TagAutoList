import type { CSSProperties } from "react";

/**
 * Every list gets its own colour, derived from its id, so it is stable across
 * devices with no stored setting. Tuned to sit with the blue/orange base and
 * deliberately has no green.
 */
const PALETTE = [
  "#2f7df6", // blue
  "#14a5c8", // cyan
  "#5b6cf0", // indigo
  "#8b5cf6", // violet
  "#c455d6", // orchid
  "#e5527a", // rose
  "#f2674a", // coral
  "#f28c28", // orange
  "#e0a41a", // amber
  "#3a9bdc", // sky
  "#6f7fd8", // periwinkle
  "#d9625f", // brick
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function listColor(id: string): string {
  return PALETTE[hash(id) % PALETTE.length];
}

/** Sets --lc, which the .lc-* classes in globals.css read. */
export function listStyle(id: string): CSSProperties {
  return { ["--lc" as string]: listColor(id) };
}
