// Language of an index entry, read from the recipe text: html lang is unreliable (CMS themes default to "en",
// multilingual sites keep one lang for every page).
import { franc } from "franc";

/** franc (ISO 639-3) → index language of the MVP. */
const CODES: Record<string, string> = {
  eng: "en", fra: "fr", deu: "de", ita: "it", spa: "es", por: "pt", nld: "nl", swe: "sv", dan: "da", nob: "no", nno: "no",
  fin: "fi", hun: "hu", ces: "cs", slk: "sk", hrv: "hr", ron: "ro", pol: "pl", cat: "ca", tur: "tr", ell: "el", rus: "ru",
  ukr: "uk", jpn: "ja", kor: "ko", cmn: "zh-Hant",
};
const ONLY = Object.keys(CODES);
/** Pairs trigram detection confuses on short texts: within a pair, the site's language wins. */
const CLOSE = [new Set(["da", "no"]), new Set(["cs", "sk"])];
const MIN_TEXT = 40;

export type LanguageHints = { declared?: string; site: string };

function normalizeTag(tag: string | undefined): string | undefined {
  const t = (tag ?? "").toLowerCase();
  if (!t) return undefined;
  if (/^zh-(tw|hant|hk)/.test(t)) return "zh-Hant";
  if (/^(nb|nn)\b/.test(t)) return "no";
  const base = t.split(/[-_]/)[0]!;
  return Object.values(CODES).includes(base) ? base : undefined;
}

export function detectLanguage(r: { title?: string; ingredients: string[]; instructions: string[] }, hints: LanguageHints): string {
  const text = [r.title ?? "", ...r.ingredients, ...r.instructions].join("\n").slice(0, 3000);
  const detected = text.replace(/\s+/g, "").length >= MIN_TEXT ? CODES[franc(text, { only: ONLY, minLength: MIN_TEXT })] : undefined;
  if (detected) {
    const pair = CLOSE.find((p) => p.has(detected) && p.has(hints.site));
    return pair ? hints.site : detected;
  }
  const declared = normalizeTag(hints.declared);
  return declared && declared !== "en" ? declared : hints.site;
}
