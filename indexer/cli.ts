// Usage: npx tsx indexer/cli.ts audit <host>...   |   npx tsx indexer/cli.ts page <url>... [--lang <site language>]
import { auditSite, indexPage, openSite } from "./index.ts";

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "audit") {
  for (const host of args) console.log(JSON.stringify(await auditSite(host), null, 1));
} else if (cmd === "page") {
  for (const url of args.filter((a, i) => a !== "--lang" && args[i - 1] !== "--lang")) {
    const open = await openSite(new URL(url).host);
    const lang = process.argv.includes("--lang") ? process.argv[process.argv.indexOf("--lang") + 1]! : "en";
    console.log(JSON.stringify("excluded" in open ? open : await indexPage(open.site, open.robots, url, lang), null, 1));
  }
} else {
  console.error("usage: cli.ts audit <host>... | page <url>...");
  process.exit(2);
}
