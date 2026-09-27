// Guardrail 5 of D9: automatic pass over the terms of every admitted site. Output = candidates for human review.
// Usage: npx tsx bench/terms.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openSite } from "../indexer/audit.ts";
import { auditTerms, type TermsResult } from "../indexer/terms.ts";

const OUT = new URL("./runs/TERMS/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
type S = { host: string; lang: string; admission?: { excluded: string | null; estimate?: number } };
const sites: S[] = JSON.parse(readFileSync(new URL("../indexer/sites.json", import.meta.url), "utf8"));
const admitted = sites.filter((s) => s.admission?.excluded === null);

const results: (TermsResult & { lang: string; estimate?: number })[] = existsSync(`${OUT}terms.json`) ? JSON.parse(readFileSync(`${OUT}terms.json`, "utf8")) : [];
const done = new Set(results.map((r) => r.host));
const todo = admitted.filter((s) => !done.has(s.host));
for (let i = 0; i < todo.length; i += 40) {
  const batch = await Promise.all(
    todo.slice(i, i + 40).map(async (s) => {
      const open = await openSite(s.host);
      const r: TermsResult = "excluded" in open ? { host: s.host, pages: [], findings: [], note: `site ${open.excluded}` } : await auditTerms(open.site, open.origin);
      return { ...r, host: s.host, lang: s.lang, estimate: s.admission?.estimate };
    }),
  );
  results.push(...batch);
  writeFileSync(`${OUT}terms.json`, JSON.stringify(results, null, 1));
  console.log(`${Math.min(i + 40, todo.length)}/${todo.length}`);
}
const flagged = results.filter((r) => r.findings.length);
console.log(`${results.length} sites ; pages de CGU trouvées : ${results.filter((r) => r.pages.length).length} ; signalés : ${flagged.length} (scraping ${flagged.filter((r) => r.findings.some((f) => f.kind === "scraping")).length})`);
