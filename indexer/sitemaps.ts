import { isError, type Site } from "./site.ts";

const RECIPE_SITEMAP = /recipe|recette|rezept|receta|ricett|recept|opskrift|oppskrift|resep|receit|przepis|recepty|recepten|reseptit/i;
const loc = (tag: string) =>
  new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>(?:(?!</(?:\\w+:)?${tag}>)[\\s\\S])*?<(?:\\w+:)?loc>\\s*(?:<!\\[CDATA\\[)?\\s*([^<\\]\\s]+)`, "gi");
const LOC_SITEMAP = loc("sitemap");
const LOC_URL = loc("url");
const REFUSED = new Set([401, 403, 429]);

export type SitemapResult = { urls: string[]; sitemaps: number; capped: boolean; refused: boolean };

const decodeXml = (s: string) => s.replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'");

/** Breadth-first over sitemap indexes, preferring recipe-named children; at most `max` sitemaps read. */
export async function collectSitemaps(site: Site, roots: string[], max = 200): Promise<SitemapResult> {
  const queue = [...roots];
  const seen = new Set<string>();
  const urls = new Set<string>();
  let capped = false;
  let refused = false;
  while (queue.length) {
    if (seen.size >= max) {
      capped = true;
      break;
    }
    const sm = queue.shift()!;
    if (seen.has(sm)) continue;
    seen.add(sm);
    const r = await site.get(sm);
    if (isError(r) || r.status !== 200) {
      if (!isError(r) && REFUSED.has(r.status)) refused = true;
      continue;
    }
    const xml = r.text();
    const children = [...xml.matchAll(LOC_SITEMAP)].map((m) => decodeXml(m[1]!));
    if (children.length) {
      const recipe = children.filter((c) => {
        try {
          return RECIPE_SITEMAP.test(new URL(c).pathname);
        } catch {
          return false;
        }
      });
      queue.push(...(recipe.length ? recipe : children));
    }
    for (const m of xml.matchAll(LOC_URL)) urls.add(decodeXml(m[1]!));
  }
  return { urls: [...urls], sitemaps: seen.size, capped, refused };
}
