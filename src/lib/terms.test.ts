import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UP_NEXT, UP_NEXT_NAME } from "./terms";

const SRC = join(__dirname, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|css)$/.test(f) ? [p] : [];
  });
}

/** Code with comments removed (the rule is about strings that reach the screen). */
const code = (p: string) =>
  readFileSync(p, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const rel = (p: string) => p.slice(SRC.length + 1).replaceAll("\\", "/");
const sources = files(SRC).filter((p) => !/\.test\.tsx?$/.test(p));

describe("Up Next naming", () => {
  it("builds every phrase from the one name", () => {
    expect(UP_NEXT.name).toBe(UP_NEXT_NAME);
    for (const [k, v] of Object.entries(UP_NEXT)) {
      if (k === "href" || k === "name" || typeof v !== "string") continue;
      if (/Up Next|up next/i.test(v)) expect(v, k).toContain(UP_NEXT_NAME);
    }
    expect(UP_NEXT.chosen(2, 5)).toContain(UP_NEXT_NAME);
  });

  it("is not hard-coded anywhere in src except lib/terms.ts", () => {
    const name = new RegExp(UP_NEXT_NAME.replace(/\s+/g, "\s+"), "i");
    const offenders = sources.filter((p) => rel(p) !== "lib/terms.ts" && name.test(code(p))).map(rel);
    expect(offenders).toEqual([]);
  });

  it("leaves no trace of the old name except the legacy-value handling", () => {
    const old = /my[\s_-]?day/i;
    const offenders = sources.filter((p) => rel(p) !== "lib/landing.ts" && old.test(code(p))).map(rel);
    expect(offenders).toEqual([]);
  });
});
