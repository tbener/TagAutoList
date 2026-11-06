import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pkg from "../../package.json";
import { parseChangelog } from "./changelog";

const md = `# Changelog

Intro text.

## [0.2.0] — 2026-11-02

### Added
- First thing
  that wraps
- Second thing

### Fixed
- A bug

## [0.1.0] — 2026-10-01

### Added
- Hello
`;

describe("parseChangelog", () => {
  it("reads releases, groups and bullets, newest first as written", () => {
    const r = parseChangelog(md);
    expect(r.map((x) => [x.version, x.date])).toEqual([
      ["0.2.0", "2026-11-02"],
      ["0.1.0", "2026-10-01"],
    ]);
    expect(r[0].groups).toEqual([
      { title: "Added", items: ["First thing that wraps", "Second thing"] },
      { title: "Fixed", items: ["A bug"] },
    ]);
  });

  it("the real CHANGELOG.md parses and its newest entry matches package.json", () => {
    const releases = parseChangelog(readFileSync("CHANGELOG.md", "utf8"));
    expect(releases.length).toBeGreaterThan(0);
    expect(releases[0].version).toBe(pkg.version);
    expect(releases.every((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date))).toBe(true);
    expect(releases.every((r) => r.groups.every((g) => g.items.length > 0))).toBe(true);
  });
});
