// Port of recipe_scrapers/_schemaorg.py. Deliberate leniencies (more pages read, never a different value on
// pages upstream reads): non-object items and malformed HowToSteps are skipped instead of aborting the page;
// an @context list containing a schema.org URL is accepted; an @graph object (Yoast, keys "0".."n") is read as a list; a Recipe nested in another entity is found.
import type { CheerioAPI } from "cheerio/slim";
import { extractJsonLd, extractMicrodata, type Json, type JsonObject } from "./extract.ts";
import { csvToTags, getMinutes, getYields, normalizeString } from "./utils.ts";

/** A field the page does not provide; the scraper falls back to the next source. */
export class FieldMissing extends Error {}

export const isObject = (v: unknown): v is JsonObject => typeof v === "object" && v !== null && !Array.isArray(v);

/** Python truthiness for JSON values. */
export const truthy = (v: unknown): boolean =>
  !(v === undefined || v === null || v === false || v === 0 || v === "" || (Array.isArray(v) && v.length === 0) || (isObject(v) && Object.keys(v).length === 0));

const str = (v: Json | undefined, field: string): string => {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  throw new FieldMissing(`${field}: not a string`);
};

function containsType(item: JsonObject, type: string): boolean {
  const t = item["@type"] ?? "";
  const types = Array.isArray(t) ? t : [t];
  return types.map((x) => String(x ?? "")).join("\n").toLowerCase().includes(type.toLowerCase());
}

function findEntity(item: JsonObject, type: string): JsonObject | undefined {
  if (containsType(item, type)) return item;
  const raw = item["@graph"];
  const graph = Array.isArray(raw) ? raw : isObject(raw) ? Object.values(raw) : [];
  for (const g of graph) {
    for (const node of Array.isArray(g) ? g : [g]) {
      if (isObject(node) && containsType(node, type)) return node;
    }
  }
  return undefined;
}

function hasSchemaContext(item: JsonObject): boolean {
  const c = item["@context"] ?? "";
  if (typeof c === "string") return c.includes("schema.org");
  if (Array.isArray(c)) return c.some((x) => typeof x === "string" && x.includes("schema.org"));
  if (isObject(c)) return "schema.org" in c;
  return false;
}

/** One instruction line, tagged with the HowToSection it belongs to. */
export type InstructionLine = { text: string; section?: string; isSectionName?: boolean };

/** Depth-first search for a Recipe object anywhere in a JSON-LD / microdata item. */
function findNestedRecipe(v: Json, depth = 0): JsonObject | undefined {
  if (depth > 12) return undefined;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = findNestedRecipe(x, depth + 1);
      if (r) return r;
    }
    return undefined;
  }
  if (!isObject(v)) return undefined;
  if (containsType(v, "Recipe")) return v;
  for (const x of Object.values(v)) {
    const r = findNestedRecipe(x, depth + 1);
    if (r) return r;
  }
  return undefined;
}

export class SchemaOrg {
  data: JsonObject = {};
  format?: string;
  people: Record<string, JsonObject> = {};
  ratingsData: Record<string, JsonObject> = {};
  websiteName?: Json;

  constructor($: CheerioAPI, baseUrl?: string) {
    const syntaxes: [string, Json[]][] = [
      ["json-ld", extractJsonLd($)],
      ["microdata", extractMicrodata($, baseUrl)],
    ];
    const objects = syntaxes.map(([s, items]) => [s, items.filter(isObject)] as const);

    for (const [, items] of objects) {
      for (const item of items) {
        const website = findEntity(item, "WebSite");
        if (website) this.websiteName = website.name;
      }
    }
    for (const [, items] of objects) {
      for (const item of items) {
        const person = findEntity(item, "Person");
        const key = person && (person["@id"] || person.url);
        if (person && key && typeof key === "string") this.people[key] = person;
      }
    }
    for (const [, items] of objects) {
      for (const item of items) {
        const rating = findEntity(item, "AggregateRating");
        const id = rating?.["@id"];
        if (rating && id && typeof id === "string") this.ratingsData[id] = rating;
      }
    }
    for (const [syntax, items] of objects) {
      for (const item of items) {
        if (!hasSchemaContext(item)) continue;
        let recipe: Json | undefined = findEntity(item, "Recipe");
        if (!recipe) {
          if (containsType(item, "WebPage") && truthy(item.mainEntity)) recipe = item.mainEntity;
          else continue;
        }
        if (!isObject(recipe) || !containsType(recipe, "Recipe")) continue;

        if (!truthy(this.data)) this.data = recipe;
        for (const prop of ["@id", "name"]) {
          const existing = this.data[prop];
          if (truthy(existing) && JSON.stringify(recipe[prop]) === JSON.stringify(existing)) {
            this.format = syntax;
            for (const [k, v] of Object.entries(recipe)) if (!(k in this.data)) this.data[k] = v;
          }
        }
      }
    }
    // Recipe nested as a property of another entity (e.g. WebPage.itemReviewed in microdata).
    if (!truthy(this.data)) {
      for (const [syntax, items] of objects) {
        const nested = items.filter(hasSchemaContext).map((i) => findNestedRecipe(i)).find(Boolean);
        if (nested) {
          this.data = nested;
          this.format = syntax;
          break;
        }
      }
    }
  }

  private has(...keys: string[]) {
    return keys.some((k) => k in this.data);
  }

  siteName(): string {
    if (!truthy(this.websiteName)) throw new FieldMissing("site name");
    return normalizeString(str(this.websiteName, "site name"));
  }

  language(): Json | undefined {
    return this.data.inLanguage || this.data.language || undefined;
  }

  title(): string {
    return normalizeString(str(this.data.name, "title"));
  }

  category(): string | undefined {
    const c = this.data.recipeCategory;
    if (Array.isArray(c)) return c.map((x) => normalizeString(str(x, "category"))).join(",");
    if (c !== undefined && c !== null) return normalizeString(str(c, "category"));
    return undefined;
  }

  author(): string | undefined {
    let a: Json | undefined = this.data.author || this.data.Author;
    if (Array.isArray(a) && a.length >= 1 && isObject(a[0])) a = a[0];
    if (isObject(a)) {
      const key = a["@id"] || a.url;
      if (typeof key === "string" && key in this.people) a = this.people[key];
    }
    if (isObject(a)) a = a!.name;
    if (truthy(a)) return str(a, "author").trim();
    return undefined;
  }

  private duration(k: string): number | undefined {
    const v = this.data[k];
    if (v === undefined || v === null) return undefined;
    if (typeof v === "string") return getMinutes(v);
    if (isObject(v) && truthy(v.maxValue)) return getMinutes(v.maxValue);
    return undefined;
  }

  totalTime(): number | undefined {
    if (!this.has("totalTime", "prepTime", "cookTime")) throw new FieldMissing("total time");
    const total = this.duration("totalTime");
    if (total) return total;
    const prep = this.duration("prepTime") || 0;
    const cook = this.duration("cookTime") || 0;
    return prep || cook ? prep + cook : undefined;
  }

  cookTime(): number | undefined {
    if (!this.has("cookTime")) throw new FieldMissing("cook time");
    return this.duration("cookTime");
  }

  prepTime(): number | undefined {
    if (!this.has("prepTime")) throw new FieldMissing("prep time");
    return this.duration("prepTime");
  }

  yields(): string | undefined {
    if (!this.has("recipeYield", "yield")) throw new FieldMissing("yields");
    const y = this.data.recipeYield || this.data.yield;
    return truthy(y) ? getYields(y) : undefined;
  }

  image(): string {
    let image: Json | undefined = this.data.image;
    if (image === undefined || image === null) throw new FieldMissing("image");
    if (Array.isArray(image)) image = image[0];
    if (isObject(image)) image = image.url;
    const s = str(image, "image");
    return s.includes("http://") || s.includes("https://") ? s : "";
  }

  private static ingredientToString(i: Json): string {
    if (typeof i === "string") return i;
    if (isObject(i)) {
      const t = i["@type"] ?? "";
      const types = Array.isArray(t) ? t : [t];
      if (types.includes("PropertyValue")) {
        const s = (x: Json | undefined) => (x === undefined || x === null ? "" : String(x));
        const unit = s(i.unitText) || s(i.unitCode);
        const parts = unit ? [s(i.value ?? ""), unit, s(i.name ?? "")] : [s(i.value ?? ""), s(i.name ?? "")];
        return parts.filter(Boolean).join(" ").trim();
      }
    }
    return typeof i === "number" ? String(i) : JSON.stringify(i);
  }

  ingredients(): string[] {
    let ings: Json = this.data.recipeIngredient || this.data.ingredients || [];
    if (Array.isArray(ings) && ings.length && Array.isArray(ings[0])) ings = ings.flat(1);
    if (typeof ings === "string") ings = [ings];
    if (!Array.isArray(ings)) return [];
    const out: string[] = [];
    for (const i of ings) {
      if (i === null || i === undefined) continue;
      const s = normalizeString(SchemaOrg.ingredientToString(i));
      if (s) out.push(s);
    }
    return out;
  }

  nutrients(): Record<string, string> {
    const n = this.data.nutrition ?? {};
    if (!isObject(n)) throw new FieldMissing("nutrients");
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(n)) {
      if (!k || !truthy(v) || k.startsWith("@") || k === "type") continue;
      const val = typeof v === "string" ? v : typeof v === "number" ? String(v) : JSON.stringify(v);
      out[normalizeString(k)] = normalizeString(val);
    }
    return out;
  }

  private howTo(item: Json, section?: string): InstructionLine[] {
    if (typeof item === "string") return [{ text: item, section }];
    if (!isObject(item)) return [];
    const out: InstructionLine[] = [];
    if (item["@type"] === "HowToStep") {
      const name = item.name;
      let step: Json | undefined = item;
      const text = step.text;
      if (truthy(name) && typeof name === "string" && typeof text === "string" && !text.startsWith(name.replace(/\.+$/, ""))) {
        out.push({ text: name, section });
      }
      if (truthy(step.itemListElement)) step = step.itemListElement;
      const t = isObject(step) ? step.text : undefined;
      if (typeof t === "string") out.push({ text: t, section });
      else if (typeof name === "string" && !truthy(text)) out.push({ text: name, section });
    } else if (item["@type"] === "HowToSection") {
      const name = item.name ?? item.Name;
      const sectionName = typeof name === "string" ? name : undefined;
      if (name !== undefined && name !== null) out.push({ text: String(name), section: sectionName, isSectionName: true });
      let elements = item.itemListElement || [];
      if (isObject(elements)) elements = [elements];
      if (Array.isArray(elements)) for (const e of elements) out.push(...this.howTo(e, sectionName));
    }
    return out;
  }

  /** Structured instruction lines, or the raw value when recipeInstructions is not a list of HowTo items. */
  private resolveInstructions(): { lines: InstructionLine[] } | { raw: string } {
    let ins: Json = this.data.recipeInstructions || this.data.RecipeInstructions || "";
    if (Array.isArray(ins) && ins.length && Array.isArray(ins[0]) && ins.every(Array.isArray)) ins = ins.flat(1);
    if (isObject(ins)) ins = ins.itemListElement ?? null;
    if (Array.isArray(ins)) return { lines: ins.flatMap((i) => this.howTo(i)).map((l) => ({ ...l, text: normalizeString(l.text) })) };
    return { raw: typeof ins === "string" ? ins : "" };
  }

  /** Instruction lines with their section; undefined when recipeInstructions is a plain string. */
  instructionLines(): InstructionLine[] | undefined {
    const r = this.resolveInstructions();
    return "lines" in r ? r.lines : undefined;
  }

  /** recipe-scrapers' `instructions()`: lines joined by "\n", section names included as lines. */
  instructions(): string {
    const r = this.resolveInstructions();
    return "lines" in r ? r.lines.map((l) => l.text).join("\n") : r.raw;
  }

  cuisine(): string {
    const c = this.data.recipeCuisine;
    if (c === undefined || c === null) throw new FieldMissing("cuisine");
    if (Array.isArray(c)) return c.map((x) => str(x, "cuisine")).join(",");
    return str(c, "cuisine");
  }

  description(): string {
    let d: Json | undefined = this.data.description;
    if (d === undefined || d === null) throw new FieldMissing("description");
    if (Array.isArray(d) && d.length) d = d[0];
    return normalizeString(str(d, "description"));
  }

  keywords(): string[] {
    const k = this.data.keywords;
    if (k === undefined || k === null) throw new FieldMissing("keywords");
    if (!truthy(k)) return [];
    const joined = Array.isArray(k) ? k.map((x) => normalizeString(str(x, "keywords"))).join(", ") : normalizeString(str(k, "keywords"));
    return csvToTags(joined);
  }
}
