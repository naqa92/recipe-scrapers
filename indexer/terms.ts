// Guardrail 5 of D9: a site whose terms forbid scraping, data mining or commercial reuse leaves the index.
// Automatic pass = candidate clauses with their context; the verdict per site is a human review.
import { load } from "cheerio/slim";
import { isError, type Site } from "./site.ts";

/** Link text or href of a terms / legal page, in the MVP languages. */
const TERMS_LINK =
  /terms|conditions|condiciones|condizioni|condições|condicions|cgu|cgv|conditions-generales|mentions|legal|agb|nutzungsbedingungen|impressum|t[eé]rminos|termini|termos|voorwaarden|gebruiksvoorwaarden|villkor|anv[aä]ndarvillkor|vilk[aå]r|bruksvilk[aå]r|ehdot|k[aä]ytt[oö]ehdot|felhaszn[aá]l[aá]si|felt[eé]tel|podm[ií]nky|podmienky|uvjeti|termeni|regulamin|warunki|ko[sş]ul|[sş]artlar|kullan[iı]m|όροι|условия|соглашени|умови|правила|利用規約|規約|이용약관|약관|使用條款|服務條款|條款/i;
/** Stronger than a generic legal page: the terms themselves. */
const TERMS_STRONG = /terms|conditions|condiciones|condizioni|condições|condicions|cgu|agb|nutzungsbedingungen|t[eé]rminos|termini|termos|voorwaarden|villkor|vilk[aå]r|ehdot|felhaszn|podm[ií]nky|podmienky|uvjeti|termeni|regulamin|ko[sş]ul|όροι|условия|соглашени|умови|規約|약관|條款/i;
const FALLBACK_PATHS = ["/terms", "/terms-of-use", "/terms-and-conditions", "/terms-of-service", "/legal", "/cgu", "/mentions-legales", "/agb", "/nutzungsbedingungen", "/impressum"];

const SCRAPING =
  /scrap(?:e|es|ing|er|ers)\b|screen[- ]?scrap|crawl(?:er|ers|ing)?\b|spider|data[- ]?mining|text (?:and|&) data mining|fouille de (?:textes et de )?donn[ée]es|moyens automatis|automated (?:means|access|systems?|tools?|queries|process)|automatisiert|data-mining|extrahier|estrazione (?:automatic|sistematic)|raccolta automatic|extracci[oó]n (?:autom[aá]tic|sistem[aá]tic)|medios automatizados|geautomatiseerd|automatiserad|automatisk|automaattis|automatiz|zautomatyzowan|otomatik|αυτοματοποιημέν|автоматизирован|автоматизован|парсинг|スクレイピング|クローラ|크롤링|스크래핑|爬蟲|爬虫|機器人|robots?\b/i;
const COMMERCIAL =
  /commercial (?:purpose|use)s?|for commercial|usage commercial|fins? commerciale?s?|utilisation commerciale|kommerziell|gewerblich|uso commerciale|scopi commerciali|fini commerciali|uso comercial|fines comerciales|fins comerciais|commerci[eë]le|kommersiell|kaupallis|kereskedelmi|komer[čc]n|komercyjn|comercial|ticari|εμπορικ|коммерческ|комерційн|商業|商用|상업/i;

export type TermsFinding = { kind: "scraping" | "commercial"; page: string; excerpt: string };
export type TermsResult = { host: string; pages: string[]; findings: TermsFinding[]; note?: string };

function textOf(html: string): string {
  const $ = load(html);
  $("script, style, noscript, svg, nav, header").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

/** Clause candidates: each match with ~220 characters of context, deduplicated by position. */
export function scanTerms(text: string, page: string): TermsFinding[] {
  const out: TermsFinding[] = [];
  const taken: number[] = [];
  for (const [kind, re] of [["scraping", SCRAPING], ["commercial", COMMERCIAL]] as const) {
    const g = new RegExp(re.source, "gi");
    for (const m of text.matchAll(g)) {
      const at = m.index ?? 0;
      if (taken.some((t) => Math.abs(t - at) < 300)) continue;
      taken.push(at);
      out.push({ kind, page, excerpt: text.slice(Math.max(0, at - 220), at + 220) });
      if (out.length >= 12) return out;
    }
  }
  return out;
}

export function termsLinks(html: string, base: string): string[] {
  const $ = load(html);
  const origin = new URL(base).host.replace(/^www\./, "");
  const scored = new Map<string, number>();
  $("a[href]").each((_, a) => {
    const href = $(a).attr("href") ?? "";
    const label = `${$(a).text()} ${href}`;
    if (!TERMS_LINK.test(label)) return;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || url.host.replace(/^www\./, "") !== origin) return;
    url.hash = "";
    const score = TERMS_STRONG.test(label) ? 2 : 1;
    scored.set(url.href, Math.max(scored.get(url.href) ?? 0, score));
  });
  return [...scored].sort((a, b) => b[1] - a[1]).map(([u]) => u).slice(0, 3);
}

/** Terms pages of a site (links from the home page, else usual paths) and their candidate clauses. */
export async function auditTerms(site: Site, origin: string): Promise<TermsResult> {
  const host = new URL(origin).host;
  const home = await site.get(`${origin}/`);
  let links = !isError(home) && home.status === 200 ? termsLinks(home.text(), home.url) : [];
  let note: string | undefined;
  if (!links.length) {
    note = "no terms link on the home page; usual paths tried";
    links = [];
    for (const p of FALLBACK_PATHS) {
      const r = await site.get(`${origin}${p}`);
      if (!isError(r) && r.status === 200 && new URL(r.url).pathname !== "/") links.push(r.url);
      if (links.length >= 2) break;
    }
  }
  const findings: TermsFinding[] = [];
  const pages: string[] = [];
  for (const url of links) {
    const r = await site.get(url);
    if (isError(r) || r.status !== 200) continue;
    pages.push(r.url);
    findings.push(...scanTerms(textOf(r.text()), r.url));
  }
  return { host, pages, findings, note: pages.length ? note : "no terms page found" };
}
