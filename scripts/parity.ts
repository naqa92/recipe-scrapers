// Parity report against upstream fixtures: which hosts diverge, on which fields. Writes tests/parity-report.json.
import { writeFileSync } from "node:fs";
import { cases, compare, CORE } from "../tests/parity.ts";

const arg = (k: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined);
const only = arg("--host")?.split(",");

if (only) {
  // Per-host mode for porting: print each mismatch in full, write nothing.
  let bad = 0;
  for (const c of cases().filter((x) => only.includes(x.host))) {
    let mismatches;
    try {
      mismatches = compare(c).mismatches;
    } catch (e) {
      mismatches = [{ field: "CRASH", expected: null, actual: e instanceof Error ? e.stack : String(e) }];
    }
    bad += mismatches.length ? 1 : 0;
    console.log(`${mismatches.length ? "✗" : "✓"} ${c.host}/${c.name}`);
    for (const m of mismatches) console.log(`  ${m.field}\n    expected: ${JSON.stringify(m.expected)}\n    actual:   ${JSON.stringify(m.actual)}`);
  }
  process.exit(bad ? 1 : 0);
}

const rows = cases().map((c) => {
  try {
    const { mismatches } = compare(c);
    return { host: c.host, name: c.name, fields: mismatches.map((m) => m.field), mismatches };
  } catch (e) {
    return { host: c.host, name: c.name, fields: ["CRASH"], mismatches: [{ field: "CRASH", expected: null, actual: String(e) }] };
  }
});
const hosts = new Map<string, Set<string>>();
for (const r of rows) for (const f of r.fields) hosts.set(r.host, (hosts.get(r.host) ?? new Set()).add(f));
const allHosts = new Set(rows.map((r) => r.host));
const coreBad = [...hosts].filter(([, f]) => [...f].some((x) => CORE.has(x) || x === "CRASH"));
const byField = new Map<string, number>();
for (const [, f] of hosts) for (const x of f) byField.set(x, (byField.get(x) ?? 0) + 1);
console.log(`${rows.length} fixtures, ${allHosts.size} hosts ; hosts fully identical: ${allHosts.size - hosts.size} ; hosts with a core-field mismatch: ${coreBad.length}`);
console.log("hosts per mismatching field:", Object.fromEntries([...byField].sort((a, b) => b[1] - a[1])));
writeFileSync(new URL("../tests/parity-report.json", import.meta.url), JSON.stringify(rows.filter((r) => r.fields.length), null, 1));
