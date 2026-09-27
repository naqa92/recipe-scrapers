// Fetches upstream test fixtures (hhursev/recipe-scrapers, MIT) for the ported sites into tests/fixtures/.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const UPSTREAM_COMMIT = "3fd942babba3bc79472aec267f9cfc3994b85339";
const sites: { host: string; source: string }[] = JSON.parse(readFileSync("scripts/sites.json", "utf8"));
const hosts = sites.filter((s) => s.source === "recipe-scrapers").map((s) => s.host);

const tmp = mkdtempSync(join(tmpdir(), "rs-upstream-"));
const git = (...args: string[]) => execFileSync("git", args, { cwd: tmp, stdio: "inherit" });
git("init", "-q");
git("remote", "add", "origin", "https://github.com/hhursev/recipe-scrapers.git");
git("sparse-checkout", "set", "--no-cone", ...hosts.map((h) => `tests/test_data/${h}/`));
git("fetch", "-q", "--depth", "1", "--filter=blob:none", "origin", UPSTREAM_COMMIT);
git("checkout", "-q", "FETCH_HEAD");

let n = 0;
for (const h of hosts) {
  const src = join(tmp, "tests/test_data", h);
  if (!existsSync(src)) continue;
  cpSync(src, join("tests/fixtures", h), { recursive: true });
  n++;
}
rmSync(tmp, { recursive: true, force: true });
console.log(`${n}/${hosts.length} hosts with fixtures (upstream ${UPSTREAM_COMMIT})`);
