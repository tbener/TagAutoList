/**
 * Tiny parser for the Keep a Changelog format used by CHANGELOG.md:
 * `## [x.y.z] — YYYY-MM-DD`, `### Group` and `- item` lines.
 */
export type Release = {
  version: string;
  date: string;
  groups: { title: string; items: string[] }[];
};

export function parseChangelog(md: string): Release[] {
  const releases: Release[] = [];
  let release: Release | null = null;
  let group: Release["groups"][number] | null = null;
  let lastItem = false;

  for (const raw of md.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const head = /^##\s+\[?([^\]\s]+)\]?(?:\s+[—–-]+\s+(\S+))?\s*$/.exec(line);
    if (head) {
      release = { version: head[1], date: head[2] ?? "", groups: [] };
      releases.push(release);
      group = null;
      lastItem = false;
      continue;
    }
    if (!release) continue;
    const g = /^###\s+(.+)$/.exec(line);
    if (g) {
      group = { title: g[1].trim(), items: [] };
      release.groups.push(group);
      lastItem = false;
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      if (!group) {
        group = { title: "Changed", items: [] };
        release.groups.push(group);
      }
      group.items.push(bullet[1].trim());
      lastItem = true;
    } else if (lastItem && group && /^\s+\S/.test(raw)) {
      // wrapped continuation of the previous bullet
      group.items[group.items.length - 1] += " " + raw.trim();
    } else if (!line.trim()) {
      lastItem = false;
    }
  }
  return releases;
}
