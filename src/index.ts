import { Scraper, type Recipe } from "./scraper.ts";
import { SITES } from "./sites/index.ts";
import { getHostName } from "./utils.ts";

export { Scraper, NotProvided, stripTags, type Recipe, type InstructionGroup } from "./scraper.ts";
export type { IngredientGroup } from "./grouping.ts";
export { FieldMissing } from "./schemaorg.ts";
export { getMinutes, getYields, normalizeString, getHostName } from "./utils.ts";

const REGISTRY = new Map<string, typeof Scraper>();
for (const site of SITES) for (const h of site.hosts) REGISTRY.set(h, site.scraper);

export const supportedHosts = (): string[] => [...REGISTRY.keys()];

/** Scraper for a page: the site's overrides when the host has some, the generic schema.org reader otherwise. */
export function scraperFor(html: string, url: string): Scraper {
  const Site = REGISTRY.get(getHostName(url)) ?? Scraper;
  return new Site(html, url);
}

/** Site overrides first; when they no longer give a complete read (site redesigned), the generic schema.org reader. */
export function scrapeHtml(html: string, url: string): Recipe {
  const scraper = scraperFor(html, url);
  const recipe = scraper.recipe();
  if (isComplete(recipe) || scraper.constructor === Scraper) return recipe;
  const generic = new Scraper(html, url).recipe();
  return isComplete(generic) ? generic : recipe;
}

/** What the tap needs to show a recipe: a title, at least one ingredient and one step. */
export const isComplete = (r: Recipe | undefined): boolean => !!r?.title && r.ingredients.length > 0 && r.instructions.length > 0;

export type ReadResult = {
  status?: number;
  ms: number;
  fetchMs?: number;
  finalUrl?: string;
  charset?: string;
  html?: string;
  recipe?: Recipe;
  complete: boolean;
  error?: string;
};

const CHARSET = /charset\s*=\s*["']?([\w-]+)/i;

/** Decodes with the charset from Content-Type, else <meta charset>, else UTF-8 (Response.text() is always UTF-8). */
export function decodeBody(bytes: Uint8Array, contentType: string | null): { text: string; charset: string } {
  const head = new TextDecoder("utf-8").decode(bytes.subarray(0, 4096));
  const label = (contentType && CHARSET.exec(contentType)?.[1]) || CHARSET.exec(head)?.[1] || "utf-8";
  try {
    return { text: new TextDecoder(label).decode(bytes), charset: label.toLowerCase() };
  } catch {
    return { text: new TextDecoder("utf-8").decode(bytes), charset: "utf-8" };
  }
}

export type ReadOptions = { headers?: Record<string, string>; timeoutMs?: number; fetch?: typeof fetch; keepHtml?: boolean };

/** Tap reading: fetch the page from the device and read it. Never throws. */
export async function readRecipe(url: string, opts: ReadOptions = {}): Promise<ReadResult> {
  const t0 = Date.now();
  const doFetch = opts.fetch ?? fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 10_000);
  try {
    const res = await doFetch(url, { headers: opts.headers, signal: ctrl.signal, redirect: "follow" });
    const bytes = new Uint8Array(await res.arrayBuffer());
    const fetchMs = Date.now() - t0;
    if (res.status !== 200) return { status: res.status, ms: fetchMs, fetchMs, finalUrl: res.url, complete: false };
    const { text, charset } = decodeBody(bytes, res.headers.get("content-type"));
    const recipe = scrapeHtml(text, res.url || url);
    return { status: 200, ms: Date.now() - t0, fetchMs, finalUrl: res.url, charset, recipe, complete: isComplete(recipe), html: opts.keepHtml ? text : undefined };
  } catch (e) {
    return { ms: Date.now() - t0, complete: false, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  } finally {
    clearTimeout(timer);
  }
}
