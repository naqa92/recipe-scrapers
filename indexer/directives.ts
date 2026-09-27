// Page-level guardrails of the index (D9): robots meta / X-Robots-Tag, TDM reservation, paywall, language, Recipe presence.
import { BOT } from "./site.ts";

const META = /<meta\b[^>]*>/gi;
const attr = (name: string) => new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
const NAME = attr("name");
const CONTENT = attr("content");
const LANG = /<html\b[^>]*\blang\s*=\s*["']([A-Za-z]{2,3})/i;
const NOT_FREE = /"isAccessibleForFree"\s*:\s*"?(false|False)"?/;
const MAX_SNIPPET_0 = /max-snippet\s*:\s*0\b/;

/** noindex, nosnippet, max-snippet:0, noai, tdm-reservation found in meta tags or response headers. */
export function robotDirectives(html: string, headers: Headers): Set<string> {
  const flags = new Set<string>();
  for (const m of html.match(META) ?? []) {
    const n = NAME.exec(m)?.[1]?.toLowerCase();
    const c = CONTENT.exec(m)?.[1]?.toLowerCase();
    if (n === undefined || c === undefined) continue;
    if (n === "robots" || n === BOT.toLowerCase()) {
      for (const f of ["noindex", "nosnippet", "noai"]) if (c.includes(f)) flags.add(f);
      if (MAX_SNIPPET_0.test(c)) flags.add("max-snippet:0");
    }
    if (n === "tdm-reservation" && c.trim() === "1") flags.add("tdm-reservation");
  }
  for (const part of (headers.get("x-robots-tag") ?? "").toLowerCase().split(",")) {
    if (part.includes(":") && !["robots", BOT.toLowerCase(), "max-snippet"].includes(part.split(":")[0]!.trim())) continue;
    for (const f of ["noindex", "nosnippet"]) if (part.includes(f)) flags.add(f);
    if (MAX_SNIPPET_0.test(part)) flags.add("max-snippet:0");
  }
  if ((headers.get("tdm-reservation") ?? "").trim() === "1") flags.add("tdm-reservation");
  return flags;
}

export const EXCLUDING_FLAGS = ["noindex", "nosnippet", "max-snippet:0", "tdm-reservation"];
export const isExcludedByDirectives = (flags: Set<string>) => EXCLUDING_FLAGS.some((f) => flags.has(f));
export const isPaywalled = (html: string) => NOT_FREE.test(html);
export const pageLang = (html: string) => LANG.exec(html)?.[1]?.toLowerCase();

const JSONLD_RECIPE = /"@type"\s*:\s*(?:\[[^\]]*?)?"(?:(?:https?:\/\/)?schema\.org\/|schema:)?Recipe"/;
const MICRODATA_RECIPE = /itemtype\s*=\s*["'][^"']*schema\.org\/Recipe["'\s]/i;

/** Recipe presence by pattern, independent of the reader (S9r rule). */
export const hasRecipeType = (html: string) => JSONLD_RECIPE.test(html) || MICRODATA_RECIPE.test(html);
