// Port of AbstractScraper + the default plugin chain (schema.org fill, OpenGraph fill, HTML stripping,
// title normalization, best image). Sites override the plain methods; `recipe()` applies the chain.
import { load, type CheerioAPI } from "cheerio/slim";
import { groupIngredients, type IngredientGroup } from "./grouping.ts";
import { bestImage } from "./image.ts";
import { FieldMissing, SchemaOrg } from "./schemaorg.ts";
import { getHostName, normalizeString, unescapeHtml, urlJoin } from "./utils.ts";

export type InstructionGroup = { steps: string[]; purpose: string | null };

export type Recipe = {
  url: string;
  host: string;
  canonicalUrl: string;
  title?: string;
  author?: string;
  siteName?: string;
  language?: string;
  image?: string;
  yields?: string;
  totalTime?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: string[];
  ingredientGroups: IngredientGroup[];
  /** recipe-scrapers' instructions_list: HowToSection names appear as lines. */
  instructions: string[];
  /** Steps grouped by HowToSection, section names out of the steps. */
  instructionGroups: InstructionGroup[];
  category?: string;
  cuisine?: string;
  keywords?: string[];
  nutrients?: Record<string, string>;
  /** Field → error message, for fields that could not be read. */
  errors: Record<string, string>;
};

/** Thrown by a site method when the site never provides the field. */
export class NotProvided extends Error {}

const TAG = /<!--[\s\S]*?-->|<[a-zA-Z/!?][^>]*>/g;

/** HTMLTagStripperPlugin: strip tags and unescape entities, twice (handles "&amp;lt;b&amp;gt;"). */
export function stripTags(s: string): string {
  return unescapeHtml(unescapeHtml(s.replace(TAG, "")).replace(TAG, ""));
}

export class Scraper {
  static host = "";
  readonly $: CheerioAPI;
  readonly schema: SchemaOrg;

  constructor(
    readonly html: string,
    readonly url: string,
  ) {
    // HTML5 input-stream preprocessing (as browsers and bs4 do): CRLF and CR become LF.
    this.$ = load(html.replace(/\r\n?/g, "\n"));
    this.schema = new SchemaOrg(this.$, /^https?:\/\//.test(url) ? url : undefined);
  }

  host(): string {
    return (this.constructor as typeof Scraper).host || getHostName(this.url);
  }

  private requireSchema() {
    if (!Object.keys(this.schema.data).length) throw new FieldMissing("no Recipe schema on the page");
  }

  // ---- Overridable fields: default = schema.org (SchemaOrgFillPlugin) ----
  title(): string | undefined {
    this.requireSchema();
    return this.schema.title();
  }
  author(): string | undefined {
    this.requireSchema();
    return this.schema.author();
  }
  siteName(): string | undefined {
    this.requireSchema();
    return this.schema.siteName();
  }
  category(): string | undefined {
    this.requireSchema();
    return this.schema.category();
  }
  totalTime(): number | undefined {
    this.requireSchema();
    return this.schema.totalTime();
  }
  cookTime(): number | undefined {
    this.requireSchema();
    return this.schema.cookTime();
  }
  prepTime(): number | undefined {
    this.requireSchema();
    return this.schema.prepTime();
  }
  yields(): string | undefined {
    this.requireSchema();
    return this.schema.yields();
  }
  image(): string | undefined {
    this.requireSchema();
    return this.schema.image();
  }
  ingredients(): string[] {
    this.requireSchema();
    return this.schema.ingredients();
  }
  instructions(): string {
    this.requireSchema();
    return this.schema.instructions();
  }
  cuisine(): string | undefined {
    this.requireSchema();
    return this.schema.cuisine();
  }
  keywords(): string[] | undefined {
    this.requireSchema();
    return this.schema.keywords();
  }
  nutrients(): Record<string, string> | undefined {
    this.requireSchema();
    return this.schema.nutrients();
  }

  ingredientGroups(): IngredientGroup[] {
    return groupIngredients(this.$, this.finalIngredients());
  }

  language(): string {
    const candidates: string[] = [];
    const html = this.$("html[lang]").first().attr("lang");
    if (html !== undefined) candidates.push(html);
    const meta = this.$("meta[content]")
      .filter((_, el) => (this.$(el).attr("http-equiv") ?? "").toLowerCase() === "content-language")
      .first()
      .attr("content");
    const lang = meta?.split(",", 1)[0];
    if (lang && !candidates.includes(lang)) candidates.push(lang);
    const kept = candidates.length > 1 ? candidates.filter((c) => c !== "en") : candidates;
    if (!kept.length) throw new FieldMissing("language");
    return kept[0]!;
  }

  canonicalUrl(): string {
    const href = this.$('link[rel~="canonical"][href]').first().attr("href");
    return href !== undefined ? urlJoin(this.url, href) : this.url;
  }

  /** Stewy addition: instruction steps grouped by HowToSection. */
  instructionGroups(): InstructionGroup[] {
    const lines = this.instructions === Scraper.prototype.instructions ? this.schema.instructionLines() : undefined;
    if (!lines) return [{ purpose: null, steps: this.finalInstructions() }];
    const groups: InstructionGroup[] = [];
    for (const l of lines) {
      const text = stripTags(l.text);
      if (l.isSectionName) groups.push({ purpose: normalizeString(text) || null, steps: [] });
      else if (text) {
        if (!groups.length || groups.at(-1)!.purpose !== (l.section ?? null)) groups.push({ purpose: l.section ?? null, steps: [] });
        groups.at(-1)!.steps.push(text);
      }
    }
    return groups.filter((g) => g.steps.length);
  }

  // ---- Plugin chain ----
  protected finalTitle(): string | undefined {
    const t = this.title();
    return t === undefined ? undefined : stripTags(normalizeString(t));
  }
  protected finalIngredients(): string[] {
    return this.ingredients().map(stripTags);
  }
  protected finalInstructions(): string[] {
    return stripTags(this.instructions())
      .split("\n")
      .filter((l) => l);
  }
  protected finalSiteName(): string | undefined {
    try {
      return this.siteName();
    } catch (e) {
      if (!(e instanceof FieldMissing)) throw e;
      const og = this.$('meta[property="og:site_name"]').first().attr("content") ?? this.$('meta[name="og:site_name"]').first().attr("content");
      if (og === undefined) throw new FieldMissing("site name");
      return og;
    }
  }
  /** OpenGraphFill + OpenGraphImageFetch + BestImage: any failure or empty image falls back to og:image. */
  protected finalImage(): string | undefined {
    let image: string | undefined;
    try {
      image = this.image();
    } catch {
      image = undefined;
    }
    if (!image) image = this.$('meta[property="og:image"][content]').first().attr("content");
    return bestImage(image, this.schema.data.image, this.$, this.url);
  }

  /** Helper for site overrides: grouping with explicit selectors on the final ingredient list. */
  protected groupBy(heading: string, element: string): IngredientGroup[] {
    return groupIngredients(this.$, this.finalIngredients(), heading, element);
  }

  recipe(): Recipe {
    const errors: Record<string, string> = {};
    const get = <T>(name: string, f: () => T): T | undefined => {
      try {
        return f();
      } catch (e) {
        errors[name] = e instanceof Error ? `${e.constructor.name}: ${e.message}` : String(e);
        return undefined;
      }
    };
    const ingredients = get("ingredients", () => this.finalIngredients()) ?? [];
    const instructions = get("instructions", () => this.finalInstructions()) ?? [];
    return {
      url: this.url,
      host: this.host(),
      canonicalUrl: this.canonicalUrl(),
      title: get("title", () => this.finalTitle()),
      author: get("author", () => this.author()),
      siteName: get("siteName", () => this.finalSiteName()),
      language: get("language", () => this.language()),
      image: get("image", () => this.finalImage()),
      yields: get("yields", () => this.yields()),
      totalTime: get("totalTime", () => this.totalTime()),
      prepTime: get("prepTime", () => this.prepTime()),
      cookTime: get("cookTime", () => this.cookTime()),
      ingredients,
      ingredientGroups: get("ingredientGroups", () => this.ingredientGroups()) ?? [{ purpose: null, ingredients }],
      instructions,
      instructionGroups: get("instructionGroups", () => this.instructionGroups()) ?? [{ purpose: null, steps: instructions }],
      category: get("category", () => this.category()),
      cuisine: get("cuisine", () => this.cuisine()),
      keywords: get("keywords", () => this.keywords()),
      nutrients: get("nutrients", () => this.nutrients()),
      errors,
    };
  }
}
