// Compares the reader with upstream fixture expectations on the fields Stewy keeps.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { scrapeHtml, type Recipe } from "../src/index.ts";

export const FIXTURES = new URL("./fixtures/", import.meta.url).pathname;

/** upstream key → Recipe key; mandatory keys must be absent from our output when absent from the fixture. */
const MANDATORY: [string, keyof Recipe][] = [
  ["author", "author"],
  ["canonical_url", "canonicalUrl"],
  ["host", "host"],
  ["image", "image"],
  ["ingredients", "ingredients"],
  ["instructions_list", "instructions"],
  ["language", "language"],
  ["site_name", "siteName"],
  ["title", "title"],
  ["total_time", "totalTime"],
  ["yields", "yields"],
];
const OPTIONAL: [string, keyof Recipe][] = [
  ["ingredient_groups", "ingredientGroups"],
  ["category", "category"],
  ["cook_time", "cookTime"],
  ["prep_time", "prepTime"],
  ["cuisine", "cuisine"],
  ["nutrients", "nutrients"],
  ["keywords", "keywords"],
];
export const CORE = new Set(["title", "ingredients", "instructions_list"]);

export type Case = { host: string; name: string; html: string; expect: Record<string, unknown> };
export type Mismatch = { field: string; expected: unknown; actual: unknown };

export function cases(): Case[] {
  if (!existsSync(FIXTURES)) return [];
  const out: Case[] = [];
  for (const host of readdirSync(FIXTURES).sort()) {
    for (const f of readdirSync(join(FIXTURES, host)).filter((x) => x.endsWith(".json")).sort()) {
      const html = join(FIXTURES, host, f.replace(/\.json$/, ".testhtml"));
      if (!existsSync(html)) continue;
      out.push({ host, name: f.replace(/\.json$/, ""), html: readFileSync(html, "utf8"), expect: JSON.parse(readFileSync(join(FIXTURES, host, f), "utf8")) });
    }
  }
  return out;
}

const norm = (v: unknown) => (v === null ? undefined : v);

/** Python ==: dicts compare regardless of key order, lists in order. */
export function canonical(v: unknown): string {
  return JSON.stringify(v, (_, x) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x,
  );
}

export function compare(c: Case): { recipe: Recipe; mismatches: Mismatch[] } {
  const recipe = scrapeHtml(c.html, c.host);
  const mismatches: Mismatch[] = [];
  const check = (key: string, field: keyof Recipe, expected: unknown) => {
    const actual = norm(recipe[field]);
    if (canonical(actual) !== canonical(norm(expected))) mismatches.push({ field: key, expected, actual });
  };
  for (const [key, field] of MANDATORY) {
    // An empty list and an absent field both mean "not read" (upstream raises, we return []).
    const absentList = !(key in c.expect) && Array.isArray(recipe[field]) && (recipe[field] as unknown[]).length === 0;
    if (!absentList) check(key, field, key in c.expect ? c.expect[key] : undefined);
  }
  for (const [key, field] of OPTIONAL) {
    if (key === "ingredient_groups") {
      check(key, field, c.expect.ingredient_groups ?? [{ ingredients: c.expect.ingredients, purpose: null }]);
    } else if (key in c.expect) check(key, field, c.expect[key]);
  }
  const grouped = recipe.ingredientGroups.flatMap((g) => g.ingredients).sort();
  if (JSON.stringify(grouped) !== JSON.stringify([...recipe.ingredients].sort())) {
    mismatches.push({ field: "ingredient_groups_consistency", expected: recipe.ingredients.length, actual: grouped.length });
  }
  return { recipe, mismatches };
}
