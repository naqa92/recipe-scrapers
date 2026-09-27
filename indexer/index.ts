// Link index builder (server side, Node). The app reads the page itself at tap time; the index only keeps
// what the discovery grid shows. Photos are hotlinked from the source, never copied (D9).
import { hasRecipeType, isExcludedByDirectives, isPaywalled, robotDirectives } from "./directives.ts";
import { BOT, isError, type Site } from "./site.ts";
import { detectLanguage } from "./language.ts";
import { unpublishedReason } from "./quality.ts";
import type { Robots } from "./audit.ts";
import { isComplete, scrapeHtml } from "../src/index.ts";

export { auditSite, openSite, sitemapRoots, shuffle, rng, type Audit } from "./audit.ts";
export { collectSitemaps } from "./sitemaps.ts";
export { hasRecipeType, robotDirectives, isExcludedByDirectives, pageLang } from "./directives.ts";
export { Site, BOT, BOT_HEADERS } from "./site.ts";
export { detectLanguage } from "./language.ts";
export { unpublishedReason } from "./quality.ts";

export type IndexEntry = {
  url: string;
  host: string;
  title: string;
  siteName?: string;
  author?: string;
  image?: string;
  totalTime?: number;
  /** Read from the recipe text (detectLanguage), not from the page's html lang. */
  language: string;
  category?: string;
  cuisine?: string;
  keywords?: string[];
};

export type IndexOutcome = { entry: IndexEntry } | { skipped: string; status?: number };

/** One sitemap URL → index entry, or the reason it stays out of the index. `siteLang` = the site's index language. */
export async function indexPage(site: Site, robots: Robots, url: string, siteLang: string): Promise<IndexOutcome> {
  if (robots.isAllowed(url, BOT) === false) return { skipped: "robots" };
  const r = await site.get(url);
  if (isError(r)) return { skipped: r.error };
  if (r.status !== 200) return { skipped: "http", status: r.status };
  const html = r.text();
  if (isExcludedByDirectives(robotDirectives(html, r.headers))) return { skipped: "robots_meta" };
  if (isPaywalled(html)) return { skipped: "paywall" };
  if (!hasRecipeType(html)) return { skipped: "no_recipe" };
  const recipe = scrapeHtml(html, r.url);
  if (!isComplete(recipe)) return { skipped: "incomplete" };
  const unpublished = unpublishedReason(html, recipe.title, r.url);
  if (unpublished) return { skipped: unpublished };
  const language = detectLanguage(recipe, { declared: recipe.language, site: siteLang });
  const { host, title, siteName, author, image, totalTime, category, cuisine, keywords } = recipe;
  return { entry: { url: recipe.canonicalUrl || url, host, title: title!, siteName, author, image, totalTime, language, category, cuisine, keywords } };
}
