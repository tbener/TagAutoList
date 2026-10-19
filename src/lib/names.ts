/** Name normalisation shared by the client store and the server actions. */

export const cleanName = (s: string) => s.trim().replace(/\s+/g, " ").slice(0, 60);

export const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Cleaned, non-empty, case-insensitively de-duplicated (first spelling wins). */
export function cleanNames(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names.map(cleanName)) {
    if (n && !seen.has(n.toLowerCase())) {
      seen.add(n.toLowerCase());
      out.push(n);
    }
  }
  return out;
}
