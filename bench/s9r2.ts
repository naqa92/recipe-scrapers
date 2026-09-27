// Spike S9r2: site re-admission with the app's user agent, then tap reading on a fresh set.
// Rule frozen in app-studio apps/001-stewy/research/raw/tech/spikes.md § S9r2 (run unique).
// Usage: npx tsx bench/s9r2.ts [--only-admission]
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { hasRecipeType, isExcludedByDirectives, robotDirectives } from "../indexer/directives.ts";
import { auditSite, openSite, shuffle, type Audit, type Robots } from "../indexer/audit.ts";
import { BOT, type Site } from "../indexer/site.ts";
import { readRecipe } from "../src/index.ts";

const SEED = 202609281;
const ADMISSION_SEED = 20260928;
const MIN_RECIPES = 2000;
const PER_LANG = 40;
const SITE_DRAW_CAP = 200; // operational bound: a site whose sitemap is mostly non-recipe pages stops drawing
const CONCURRENCY = 16; // draws in flight per language (each site still 1 request/s)
const MVP = "en fr de it es pt nl sv da no fi hu cs sk hr ro pl ca tr el ru uk ja ko zh-Hant".split(" ");
const OUT = new URL("./runs/S9R2/", import.meta.url).pathname;
const S9R = new URL("./runs/S9R/", import.meta.url).pathname;
mkdirSync(`${OUT}html`, { recursive: true });

const APP_UA = "Stewy/1 CFNetwork/1568.100.1 Darwin/24.0.0";
const appHeaders = (lang: string) => ({
  "User-Agent": APP_UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": `${lang === "zh-Hant" ? "zh-TW" : lang},en;q=0.8`,
});

type IndexSite = { host: string; lang: string; source: string; sampled: string[] };
const sites: IndexSite[] = JSON.parse(readFileSync(new URL("../indexer/sites.json", import.meta.url), "utf8"));

type SiteState = { host: string; lang: string; site?: Site; robots?: Robots; queue: string[]; drawn: number; note?: string };

const cachedUrls = (host: string): string[] | undefined => {
  const f = `${S9R}sitemaps/${host}.json`;
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")).urls : undefined;
};

async function prepare(host: string, lang: string, exclude: Set<string>): Promise<SiteState> {
  const open = await openSite(host);
  if ("excluded" in open) return { host, lang, queue: [], drawn: 0, note: `site ${open.excluded}` };
  const urls = cachedUrls(host) ?? [];
  const queue = shuffle([...urls].sort(), SEED).filter((u) => !exclude.has(u) && open.robots.isAllowed(u, BOT) !== false);
  return { host, lang, site: open.site, robots: open.robots, queue, drawn: 0 };
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
      headers: { ...appHeaders(st.lang) },
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

mkdirSync(`${OUT}html`, { recursive: true });
const mvpSites = sites.filter((s) => MVP.includes(s.lang));

// ---- Step 1: re-admission ----
let admissions: (Audit & { indexLang: string })[];
if (existsSync(`${OUT}admissions.json`)) admissions = JSON.parse(readFileSync(`${OUT}admissions.json`, "utf8"));
else {
  admissions = [];
  for (let i = 0; i < mvpSites.length; i += 40) {
    const batch = mvpSites.slice(i, i + 40);
    admissions.push(
      ...(await Promise.all(
        batch.map(async (s) => {
          const urls = cachedUrls(s.host);
          const a: Audit = urls?.length
            ? await auditSite(s.host, { seed: ADMISSION_SEED, appHeaders: appHeaders(s.lang), sitemapUrls: urls })
            : { host: s.host, excluded: "no_sitemap" };
          return { ...a, indexLang: s.lang };
        }),
      )),
    );
    console.log(`admission ${Math.min(i + 40, mvpSites.length)}/${mvpSites.length}`);
  }
  writeFileSync(`${OUT}admissions.json`, JSON.stringify(admissions, null, 1));
}
const volume = new Map<string, number>();
for (const a of admissions) if (a.excluded === null) volume.set(a.indexLang, (volume.get(a.indexLang) ?? 0) + (a.estimate ?? 0));
const kept = MVP.filter((l) => (volume.get(l) ?? 0) >= MIN_RECIPES);
console.log("volume:", MVP.map((l) => `${l} ${volume.get(l) ?? 0}`).join(", "));
console.log("languages kept:", kept.join(" "), "| out:", MVP.filter((l) => !kept.includes(l)).join(" ") || "none");
if (process.argv.includes("--only-admission")) process.exit(0);

// ---- Step 2: tap set ----
const exclude = new Set<string>([
  ...sites.flatMap((s) => s.sampled),
  ...JSON.parse(readFileSync(`${S9R}draws.json`, "utf8")).map((d: { url: string }) => d.url),
  ...admissions.flatMap((a) => (a.pages ?? []).map((p) => p.url)),
]);
const admitted = admissions.filter((a) => a.excluded === null && kept.includes(a.indexLang));
const states: SiteState[] = [];
for (let i = 0; i < admitted.length; i += 40) states.push(...(await Promise.all(admitted.slice(i, i + 40).map((a) => prepare(a.host, a.indexLang, exclude)))));
writeFileSync(`${OUT}sites.json`, JSON.stringify(states.map(({ host, lang, queue, note }) => ({ host, lang, candidates: queue.length, note })), null, 1));

const all = (await Promise.all(kept.map((l) => runLanguage(l, states.filter((s) => s.lang === l)))))
  .flat()
  .map(({ html, ...d }) => ({ ...d, htmlFile: html }));
writeFileSync(`${OUT}draws.json`, JSON.stringify(all, null, 1));
console.log(`done: ${all.filter((d) => d.outcome === "entered").length} pages in the set`);
