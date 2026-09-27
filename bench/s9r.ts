// Spike S9r: tap reading with the TS port on a fresh set drawn from the index.
// Rule frozen in app-studio apps/001-stewy/research/raw/tech/spikes.md § S9r (run unique).
// Usage: npx tsx bench/s9r.ts [--only-sitemaps]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { hasRecipeType, isExcludedByDirectives, robotDirectives } from "../indexer/directives.ts";
import { openSite, sitemapRoots, shuffle, type Robots } from "../indexer/audit.ts";
import { collectSitemaps } from "../indexer/sitemaps.ts";
import { BOT, type Site } from "../indexer/site.ts";
import { readRecipe } from "../src/index.ts";

const SEED = 202609271;
const PER_LANG = 40;
const SITE_DRAW_CAP = 200; // operational bound: a site whose sitemap is mostly non-recipe pages stops drawing
const CONCURRENCY = 16; // draws in flight per language (each site still 1 request/s)
const MVP = "en fr de it es pt nl sv da no fi hu cs sk hr ro pl ca tr el ru uk ja ko zh-Hant".split(" ");
const OUT = new URL("./runs/S9R/", import.meta.url).pathname;
mkdirSync(`${OUT}sitemaps`, { recursive: true });
mkdirSync(`${OUT}html`, { recursive: true });

const SAFARI_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const acceptLanguage = (lang: string) => {
  const tag = lang === "zh-Hant" ? "zh-TW" : lang;
  return `${tag},en;q=0.8`;
};

type IndexSite = { host: string; lang: string; source: string; sampled: string[] };
const sites: IndexSite[] = JSON.parse(readFileSync(new URL("../indexer/sites.json", import.meta.url), "utf8"));

type SiteState = { host: string; lang: string; site?: Site; robots?: Robots; queue: string[]; drawn: number; note?: string };

async function prepare(s: IndexSite): Promise<SiteState> {
  const cache = `${OUT}sitemaps/${s.host}.json`;
  const open = await openSite(s.host);
  if ("excluded" in open) {
    writeFileSync(cache, JSON.stringify({ excluded: open.excluded, error: open.error }));
    return { host: s.host, lang: s.lang, queue: [], drawn: 0, note: `site ${open.excluded}` };
  }
  let urls: string[];
  if (existsSync(cache) && JSON.parse(readFileSync(cache, "utf8")).urls) urls = JSON.parse(readFileSync(cache, "utf8")).urls;
  else {
    const sm = await collectSitemaps(open.site, sitemapRoots(open.origin, open.robots));
    urls = sm.urls;
    writeFileSync(cache, JSON.stringify({ urls, capped: sm.capped, refused: sm.refused }));
  }
  const seen = new Set(s.sampled);
  const queue = shuffle([...urls].sort(), SEED).filter((u) => !seen.has(u) && open.robots.isAllowed(u, BOT) !== false);
  return { host: s.host, lang: s.lang, site: open.site, robots: open.robots, queue, drawn: 0, note: urls.length ? undefined : "no sitemap URL" };
}

type Draw = {
  lang: string;
  host: string;
  url: string;
  round: number;
  outcome: "entered" | "redraw";
  reason?: string;
  status?: number;
  ms?: number;
  fetchMs?: number;
  complete?: boolean;
  nIngredients?: number;
  nSteps?: number;
  hasTitle?: boolean;
  charset?: string;
  error?: string;
  html?: string;
};

const REDRAW_STATUS = new Set([404, 410]);

async function draw(st: SiteState, url: string, round: number): Promise<Draw> {
  let headers: Headers | undefined;
  const recordingFetch: typeof fetch = async (input, init) => {
    const res = await fetch(input, init);
    headers = res.headers;
    return res;
  };
  const r = await st.site!.slot(() =>
    readRecipe(url, {
      headers: { "User-Agent": SAFARI_UA, Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "Accept-Language": acceptLanguage(st.lang) },
      timeoutMs: 10_000,
      fetch: recordingFetch,
      keepHtml: true,
    }),
  );
  const base = { lang: st.lang, host: st.host, url, round, status: r.status, ms: r.ms, fetchMs: r.fetchMs, charset: r.charset, error: r.error };
  if (r.status !== undefined && REDRAW_STATUS.has(r.status)) return { ...base, outcome: "redraw", reason: `http ${r.status}` };
  if (r.status !== 200) return { ...base, outcome: "entered", complete: false, reason: r.error ? "error" : `http ${r.status}` };
  const html = r.html ?? "";
  if (!hasRecipeType(html)) return { ...base, outcome: "redraw", reason: "no Recipe type" };
  if (isExcludedByDirectives(robotDirectives(html, headers ?? new Headers()))) return { ...base, outcome: "redraw", reason: "robots meta" };
  const rec = r.recipe!;
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  writeFileSync(`${OUT}html/${hash}.html.gz`, gzipSync(html));
  return {
    ...base,
    outcome: "entered",
    complete: r.complete,
    hasTitle: !!rec.title,
    nIngredients: rec.ingredients.length,
    nSteps: rec.instructions.length,
    html: hash,
    reason: r.complete ? undefined : `incomplete (title ${!!rec.title}, ${rec.ingredients.length} ing, ${rec.instructions.length} steps)`,
  };
}

async function runLanguage(lang: string, states: SiteState[]): Promise<Draw[]> {
  const rotation = shuffle(
    states.filter((s) => s.queue.length).map((s) => s.host).sort(),
    SEED,
  ).map((h) => states.find((s) => s.host === h)!);
  // Lazy sequence of (round, site) draws in rotation order.
  function* sequence() {
    for (let round = 0; ; round++) {
      let any = false;
      for (const st of rotation) {
        if (st.drawn >= SITE_DRAW_CAP || !st.queue.length) continue;
        any = true;
        st.drawn++;
        yield { st, url: st.queue.shift()!, round };
      }
      if (!any) return;
    }
  }
  const seq = sequence();
  const results: Draw[] = [];
  const inflight: Promise<Draw>[] = [];
  let entered = 0;
  let exhausted = false;
  const refill = () => {
    while (!exhausted && inflight.length < CONCURRENCY) {
      const n = seq.next();
      if (n.done) {
        exhausted = true;
        break;
      }
      inflight.push(draw(n.value.st, n.value.url, n.value.round));
    }
  };
  refill();
  while (inflight.length && entered < PER_LANG) {
    const d = await inflight.shift()!; // consumed in sequence order: the set does not depend on timing
    results.push(d);
    if (d.outcome === "entered") entered++;
    if (entered < PER_LANG) refill();
  }
  await Promise.allSettled(inflight);
  console.log(`${lang}: ${entered} pages (${results.length} draws)`);
  return results;
}

const mvpSites = sites.filter((s) => MVP.includes(s.lang));
const states: SiteState[] = [];
for (let i = 0; i < mvpSites.length; i += 40) states.push(...(await Promise.all(mvpSites.slice(i, i + 40).map(prepare))));
writeFileSync(`${OUT}sites.json`, JSON.stringify(states.map(({ host, lang, queue, note }) => ({ host, lang, candidates: queue.length, note })), null, 1));
console.log(`${states.length} sites prepared; without drawable URL: ${states.filter((s) => !s.queue.length).length}`);
if (process.argv.includes("--only-sitemaps")) process.exit(0);

const all = (await Promise.all(MVP.map((l) => runLanguage(l, states.filter((s) => s.lang === l)))))
  .flat()
  .map(({ html, ...d }) => ({ ...d, htmlFile: html }));
writeFileSync(`${OUT}draws.json`, JSON.stringify(all, null, 1));
console.log(`done: ${all.filter((d) => d.outcome === "entered").length} pages in the set`);
