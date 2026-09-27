// Site admission to the index (D9 guardrails, rule of spike S9v): robots.txt, tdmrep, sitemaps,
// robots meta, paywall, anti-bot refusals, and ≥ 90 % of sampled Recipe pages read in full.
import robotsParser from "robots-parser";
import { hasRecipeType, isExcludedByDirectives, isPaywalled, pageLang, robotDirectives } from "./directives.ts";
import { collectSitemaps } from "./sitemaps.ts";
import { BOT, isError, Site } from "./site.ts";
import { isComplete, readRecipe, scrapeHtml } from "../src/index.ts";

export const REFUSED = new Set([401, 403, 429]);
export const READ_MIN = 0.9;

export type Robots = { isAllowed: (url: string, ua?: string) => boolean | undefined; getSitemaps: () => string[] };

export type SiteAccess = { site: Site; origin: string; robots: Robots } | { excluded: string; error?: string };

/** robots.txt (www. fallback), home page permission and TDM reservation. */
export async function openSite(host: string): Promise<SiteAccess> {
  const site = new Site(host);
  let r = await site.get(`https://${host}/robots.txt`);
  if (isError(r) && !host.startsWith("www.")) r = await site.get(`https://www.${host}/robots.txt`);
  if (isError(r)) return { excluded: "unreachable", error: r.error };
  if (REFUSED.has(r.status)) return { excluded: "antibot" };
  const origin = new URL(r.url).origin;
  const robots = robotsParser(`${origin}/robots.txt`, r.status === 200 ? r.text() : "") as Robots;
  if (robots.isAllowed(`${origin}/`, BOT) === false) return { excluded: "robots_home" };
  const t = await site.get(`${origin}/.well-known/tdmrep.json`);
  if (!isError(t) && t.status === 200) {
    try {
      const rules = JSON.parse(t.text());
      if (Array.isArray(rules) && rules.some((x) => String(x?.["tdm-reservation"]) === "1")) return { excluded: "tdmrep" };
    } catch {
      // not a TDM policy file
    }
  }
  return { site, origin, robots };
}

export const sitemapRoots = (origin: string, robots: Robots) => [
  ...new Set([...robots.getSitemaps(), `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/wp-sitemap.xml`]),
];

/** Deterministic PRNG (mulberry32) for reproducible samples. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  const rand = rng(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export type Audit = {
  host: string;
  excluded: string | null;
  lang?: string;
  sitemapUrls?: number;
  capped?: boolean;
  pages?: { url: string; status?: number; appStatus?: number; recipe?: boolean; complete?: boolean; flags?: string[]; error?: string }[];
  estimate?: number;
};

export type AuditOptions = {
  sample?: number;
  seed?: number;
  /** Headers of the app at tap time: when set, each sampled page is also read with them and the read rate counts that read. */
  appHeaders?: Record<string, string>;
  /** Sitemap URLs already collected for this site (skips the sitemap crawl). */
  sitemapUrls?: string[];
  /** URLs that must not be sampled (already used by an earlier measure). */
  exclude?: Set<string>;
};

/** Admission audit of one site, `sample` pages read like the tap. */
export async function auditSite(host: string, { sample = 20, seed = 20260927, appHeaders, sitemapUrls, exclude }: AuditOptions = {}): Promise<Audit> {
  const open = await openSite(host);
  if ("excluded" in open) return { host, excluded: open.excluded };
  const { site, origin, robots } = open;
  let urls = sitemapUrls;
  let capped = false;
  if (!urls) {
    const sm = await collectSitemaps(site, sitemapRoots(origin, robots));
    if (!sm.urls.length) return { host, excluded: sm.refused ? "antibot" : "no_sitemap", sitemapUrls: 0 };
    urls = sm.urls;
    capped = sm.capped;
  }
  if (!urls.length) return { host, excluded: "no_sitemap", sitemapUrls: 0 };
  const drawn = shuffle([...urls].sort(), seed)
    .filter((u) => !exclude?.has(u))
    .slice(0, sample);
  if (drawn.some((u) => robots.isAllowed(u, BOT) === false)) return { host, excluded: "robots_sample", sitemapUrls: urls.length };

  const pages: NonNullable<Audit["pages"]> = [];
  const flags = new Set<string>();
  const langs = new Map<string, number>();
  let paywalled = false;
  let appRefused = false;
  for (const url of drawn) {
    const r = await site.get(url);
    if (isError(r)) {
      pages.push({ url, error: r.error });
      continue;
    }
    const page: (typeof pages)[number] = { url, status: r.status };
    if (r.status === 200) {
      const html = r.text();
      const f = robotDirectives(html, r.headers);
      f.forEach((x) => flags.add(x));
      page.flags = [...f];
      const lang = pageLang(html);
      if (lang) langs.set(lang, (langs.get(lang) ?? 0) + 1);
      paywalled ||= isPaywalled(html);
      if (appHeaders) {
        page.recipe = hasRecipeType(html);
        const app = await site.slot(() => readRecipe(url, { headers: appHeaders, timeoutMs: 10_000 }));
        page.appStatus = app.status;
        appRefused ||= app.status !== undefined && REFUSED.has(app.status);
        page.complete = app.complete;
      } else {
        const recipe = scrapeHtml(html, r.url);
        page.recipe = hasRecipeType(html) || !!recipe.title;
        page.complete = isComplete(recipe);
      }
    }
    pages.push(page);
  }
  const lang = [...langs].sort((a, b) => b[1] - a[1])[0]?.[0];
  const recipes = pages.filter((p) => p.recipe).length;
  const complete = pages.filter((p) => p.complete).length;
  const base = { host, lang, sitemapUrls: urls.length, capped, pages };
  if (pages.some((p) => p.status !== undefined && REFUSED.has(p.status))) return { ...base, excluded: "antibot" };
  if (appRefused) return { ...base, excluded: "antibot_app" };
  if (isExcludedByDirectives(flags)) return { ...base, excluded: `robots_meta:${[...flags].sort().join(",")}` };
  if (paywalled) return { ...base, excluded: "paywall" };
  if (!recipes) return { ...base, excluded: "no_recipe" };
  if (complete / recipes < READ_MIN) return { ...base, excluded: "read_rate" };
  return { ...base, excluded: null, estimate: Math.round((urls.length * complete) / drawn.length) };
}
