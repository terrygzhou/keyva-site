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
      const m = raw.match(/^---\n([\s\S]*?)\n---/);
      if (!m) throw new Error(`no frontmatter in ${relDir}/${f}`);
      const out: Record<string, unknown> = {};
      // minimal parse: top-level `key: value` lines and `- item` array items.
      let key = "";
      for (const line of m[1].split("\n")) {
        const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (kv) {
          key = kv[1];
          const v = kv[2].trim();
          out[key] = v === "" ? "" : v.replace(/^"(.*)"$/, "$1");
        } else if (line.match(/^\s*-\s*(.+)$/) && key) {
          const item = line.trim().replace(/^-\s*/, "").replace(/^"(.*)"$/, "$1");
          if (!Array.isArray(out[key])) out[key] = [];
          (out[key] as unknown[]).push(item);
        }
      }
      return out;
    });
}

describe("services collection", () => {
  it("every service has a title, description and at least one capability", () => {
    const services = readFrontmatter("services").filter((s) => s.draft !== "true");
    expect(services.length).toBeGreaterThan(0);
    for (const s of services) {
      expect(String(s.title)).toBeTruthy();
      expect(String(s.description)).toBeTruthy();
      expect(Array.isArray(s.capabilities)).toBe(true);
      expect((s.capabilities as unknown[]).length).toBeGreaterThan(0);
    }
  });
});

describe("case-studies collection", () => {
  it("every published study has results and a date", () => {
    const studies = readFrontmatter("case-studies").filter((c) => c.draft !== "true");
    expect(studies.length).toBeGreaterThan(0);
    for (const c of studies) {
      expect(Array.isArray(c.results)).toBe(true);
      expect((c.results as unknown[]).length).toBeGreaterThan(0);
      expect(String(c.date)).toBeTruthy();
    }
  });
});

describe("insights collection", () => {
  it("every published insight has a title, description and date", () => {
    const posts = readFrontmatter("insights").filter((p) => p.draft !== "true");
    expect(posts.length).toBeGreaterThan(0);
    for (const p of posts) {
      expect(String(p.title)).toBeTruthy();
      expect(String(p.description)).toBeTruthy();
      expect(String(p.date)).toBeTruthy();
    }
  });
});
