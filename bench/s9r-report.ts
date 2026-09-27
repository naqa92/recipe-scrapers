// S9r verdict from runs/S9R/draws.json (+ python.json for the information column).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { isComplete, scrapeHtml } from "../src/index.ts";

const OUT = new URL(`./runs/${process.argv[2] ?? "S9R"}/`, import.meta.url).pathname;
type Draw = { lang: string; host: string; url: string; outcome: string; reason?: string; status?: number; ms?: number; complete?: boolean; htmlFile?: string };
const draws: Draw[] = JSON.parse(readFileSync(`${OUT}draws.json`, "utf8"));
const set = draws.filter((d) => d.outcome === "entered");
const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)} %` : "—");
const p90 = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(0.9 * (s.length - 1))];
};

const lines: string[] = [];
const ok = set.filter((d) => d.complete);
const ms = ok.map((d) => d.ms!);
lines.push(`Jeu : ${set.length} pages (${draws.length} tirages, ${draws.length - set.length} remplacés)`);
const median = [...ms].sort((a, b) => a - b)[Math.floor(ms.length / 2)];
lines.push(`Lecture complète : ${ok.length}/${set.length} = ${pct(ok.length, set.length)} ; latence médiane ${median} ms, p90 ${p90(ms)} ms, max ${Math.max(...ms)} ms`);
lines.push("", "| Langue | Pages | Complètes | Taux | Sites | p90 (ms) |", "|---|---|---|---|---|---|");
const langs = [...new Set(set.map((d) => d.lang))];
const rows = langs.map((l) => {
  const g = set.filter((d) => d.lang === l);
  const c = g.filter((d) => d.complete);
  return { l, n: g.length, c: c.length, rate: c.length / g.length, sites: new Set(g.map((d) => d.host)).size, p90: p90(c.map((d) => d.ms!)) };
});
for (const r of rows.sort((a, b) => a.rate - b.rate)) lines.push(`| ${r.l} | ${r.n} | ${r.c} | ${pct(r.c, r.n)} | ${r.sites} | ${r.p90 ?? "—"} |`);

lines.push("", "Échecs par cause :");
const causes = new Map<string, Draw[]>();
for (const d of set.filter((x) => !x.complete)) {
  const k = d.reason?.startsWith("incomplete") ? "lecture incomplète" : d.reason ?? "?";
  causes.set(k, [...(causes.get(k) ?? []), d]);
}
for (const [k, ds] of [...causes].sort((a, b) => b[1].length - a[1].length)) {
  lines.push(`- ${k} : ${ds.length} — ${[...new Set(ds.map((d) => `${d.host} (${d.lang})`))].join(", ")}`);
}
lines.push("", "Remplacements par cause :");
const redraws = new Map<string, number>();
for (const d of draws.filter((x) => x.outcome === "redraw")) redraws.set(d.reason ?? "?", (redraws.get(d.reason ?? "?") ?? 0) + 1);
for (const [k, n] of redraws) lines.push(`- ${k} : ${n}`);

if (existsSync(`${OUT}python.json`)) {
  const py: Record<string, { title?: string; ingredients?: string[]; steps?: string[] }> = JSON.parse(readFileSync(`${OUT}python.json`, "utf8"));
  let same = 0;
  let both = 0;
  let tsOnly = 0;
  let pyOnly = 0;
  const diff: string[] = [];
  for (const d of set.filter((x) => x.htmlFile)) {
    const html = gunzipSync(readFileSync(`${OUT}html/${d.htmlFile}.html.gz`)).toString("utf8");
    const t = scrapeHtml(html, d.url);
    const p = py[d.url] ?? {};
    const pc = !!p.title && !!p.ingredients?.length && !!p.steps?.length;
    const tc = isComplete(t);
    if (tc && pc) {
      both++;
      if (t.title === p.title && JSON.stringify(t.ingredients) === JSON.stringify(p.ingredients) && JSON.stringify(t.instructions) === JSON.stringify(p.steps)) same++;
      else diff.push(d.url);
    } else if (tc) tsOnly++;
    else if (pc) pyOnly++;
  }
  lines.push("", `Concordance TS / Python 15.12 (info) : lues par les deux ${both}, champs identiques ${same} (${pct(same, both)}) ; lues par TS seul ${tsOnly} ; par Python seul ${pyOnly}`);
  if (diff.length) lines.push(`Pages lues par les deux avec un écart : ${diff.slice(0, 15).join(" ")}`);
}
writeFileSync(`${OUT}report.md`, lines.join("\n") + "\n");
console.log(lines.join("\n"));
