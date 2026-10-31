import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Contract tests for the content collections.
 *
 * Read the frontmatter straight off the markdown files (plain node, no
 * `astro:content` — that virtual module only resolves under the Astro
 * build/test runtime, so a standalone vitest run can't import it).
 * A small frontmatter splitter parses `---` YAML enough for our needs:
 * the fields used here are flat strings / arrays of strings.
 */

const root = join(__dirname, "..");

function readFrontmatter(relDir: string): Array<Record<string, unknown>> {
  const dir = join(root, "src/content", relDir);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = readFileSync(join(dir, f), "utf8");
      // Frontmatter = text after the opening `---`. Some product files omit the
      // closing fence (Astro tolerates that and parses to EOF), so read to a
      // closing `\n---` line if present, otherwise to end-of-file.
      const open = raw.indexOf("\n---", 3);
      const fm = open === -1 ? raw.slice(4) : raw.slice(4, open);
      if (!raw.startsWith("---\n")) throw new Error(`no frontmatter in ${relDir}/${f}`);
      const out: Record<string, unknown> = {};
      // minimal parse: top-level `key: value` lines and `- item` array items.
      let key = "";
      for (const line of fm.split("\n")) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (kv) {
          key = kv[1];
          const v = kv[2].trim();
          // Inline YAML array: key: ["a", "b"]  ->  ["a", "b"]
          if (v.startsWith("[") && v.endsWith("]")) {
            const inner = v.slice(1, -1);
            out[key] = inner
              .split(",")
              .map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
              .filter((s) => s.length > 0);
          } else {
            out[key] = v === "" ? "" : v.replace(/^"(.*)"$/, "$1");
          }
        } else if (line.match(/^\s*-\s*(.+)$/)) {
          const item = line.trim().replace(/^-\s*/, "").replace(/^"(.*)"$/, "$1");
          if (!Array.isArray(out[key])) out[key] = [];
          (out[key] as unknown[]).push(item);
        }
      }
      return out;
    });
}

describe("products collection", () => {
  it("exposes all 7 product series", () => {
    const products = readFrontmatter("products");
    const series = products.map((p) => String(p.series)).sort();
    expect(
      series.includes("SB-STD") &&
        series.includes("A-STD") &&
        series.includes("SB-PCV / RB-PCV") &&
        series.includes("TB") &&
        series.includes("RB") &&
        series.includes("RB-3P") &&
        series.length === 7,
      `expected 7 series, got ${series.length}: ${series.join(", ")}`
    ).toBe(true);
  });

  it("every product has the required bilingual fields", () => {
    const products = readFrontmatter("products");
    expect(products.length).toBeGreaterThan(0);
    for (const p of products) {
      for (const field of [
        "series",
        "nameZh",
        "nameEn",
        "descZh",
        "descEn",
        "size",
        "connection",
      ]) {
        expect(String(p[field]).trim(), `${p.series} missing ${field}`).toBeTruthy();
      }
      for (const field of ["materials", "featuresZh", "featuresEn", "appsZh", "appsEn"]) {
        expect(Array.isArray(p[field]), `${p.series} ${field} not an array`).toBe(true);
        expect(
          (p[field] as unknown[]).length,
          `${p.series} ${field} empty`
        ).toBeGreaterThan(0);
      }
    }
  });
});
