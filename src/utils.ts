// Port of recipe_scrapers/_utils.py. Regexes keep Python semantics where it matters:
// word boundaries are Unicode-aware (Python `\b` on str), rounding is half-to-even (Python `round`).
import { decodeHTML } from "entities";

export class ElementNotFound extends Error {}

const FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const TIME_REGEX = new RegExp(
  String.raw`(?:\D*(?<days>\d+)\s*(?:days|D))?` +
    String.raw`(?:\D*(?<hours>[\d.\s/?¼½¾⅓⅔⅕⅖⅗]+)\s*(?:hours|hrs|hr|h|óra|:))?` +
    String.raw`(?:\D*(?<minutes>\d+)\s*(?:minutes|mins|min|m|perc|$))?` +
    String.raw`(?:\D*(?<seconds>\d+)\s*(?:seconds|secs|sec|s))?`,
  "i",
);
const SERVE_REGEX_NUMBER = /(\D*(?<items>\d+(\.\d*)?)?\D*)/;
const SERVE_REGEX_ITEMS = /\bmakes\b|\bporzioni\b/i;
const SERVE_REGEX_TO = /\d+(\s+to\s+|-)\d+/i;

const RECIPE_YIELD_TYPES: [string, string][] = [
  ["appetizer", "appetizers"],
  ["bar", "bars"],
  ["batch", "batches"],
  ["bowl", "bowls"],
  ["bun", "buns"],
  ["cake", "cakes"],
  ["cookie", "cookies"],
  ["cup", "cups"],
  ["cupcake", "cupcakes"],
  ["dozen", "dozen"],
  ["gallon", "gallons"],
  ["gram", "grams"],
  ["kilogram", "kilograms"],
  ["hamburger bun", "hamburger buns"],
  ["item", "items"],
  ["layer", "layers"],
  ["liter", "liters"],
  ["loaf", "loaves"],
  ["milliliter", "milliliters"],
  ["muffin", "muffins"],
  ["ounce", "ounces"],
  ["pancake", "pancakes"],
  ["patty", "patties"],
  ["piece", "pieces"],
  ["pie", "pies"],
  ["pint", "pints"],
  ["pound", "pounds"],
  ["sandwich", "sandwiches"],
  ["scone", "scones"],
  ["scoop", "scoops"],
  ["slice", "slices"],
  ["taquito", "tacquitos"],
  ["brownie", "brownies"],
  ["blondie", "blondies"],
  ["churro", "churros"],
  ["crepe", "crepes"],
  ["croissant", "croissants"],
  ["donut", "donuts"],
  ["fritter", "fritters"],
  ["naan", "naan"],
  ["pierogi", "pierogies"],
  ["pizzelle", "pizzelles"],
  ["tart", "tarts"],
  ["turnover", "turnovers"],
  ["burrito", "burritos"],
  ["quesadilla", "quesadillas"],
  ["gordita", "gorditas"],
  ["falafel", "falafel"],
  ["wrap", "wraps"],
  ["skewer", "skewers"],
  ["jar", "jars"],
  ["square", "squares"],
  ["roll", "rolls"],
];

const RECIPE_YIELD_ABBREVIATIONS: [string, string, string][] = [
  ["kg", "kilogram", "kilograms"],
  ["lbs", "pound", "pounds"],
  ["lb", "pound", "pounds"],
  ["oz", "ounce", "ounces"],
  ["ml", "milliliter", "milliliters"],
  ["g", "gram", "grams"],
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const W = String.raw`[\p{L}\p{N}_]`;
const word = (s: string) => new RegExp(`(?<!${W})${escapeRegex(s)}(?!${W})`, "iu");

const YIELD_TYPE_PATTERNS = RECIPE_YIELD_TYPES.map(
  ([singular, plural]) => [word(singular), word(plural), singular, plural] as const,
);
const YIELD_ABBREVIATION_PATTERNS = RECIPE_YIELD_ABBREVIATIONS.map(
  ([abbr, singular, plural]) =>
    [new RegExp(String.raw`^\D*\d+(?:\.\d*)?\s*${escapeRegex(abbr)}(?!${W})`, "iu"), singular, plural] as const,
);

/** Python `round`: half to even. */
export function pyRound(x: number): number {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** Python `str(float)` for the values get_yields can produce. */
function pyFloatStr(x: number): string {
  return Number.isInteger(x) ? `${x}.0` : String(x);
}

/** Python `float()` on a stripped string: rejects what JS Number() would accept silently. */
function pyFloat(s: string): number {
  const t = s.trim();
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) throw new Error(`could not convert string to float: '${s}'`);
  return Number(t);
}

function extractFractional(input: string): number {
  const s = input.trim();
  for (const [frac, part] of Object.entries(FRACTIONS)) {
    if (s.includes(frac)) {
      const whole = s.slice(0, s.indexOf(frac));
      return (whole ? pyFloat(whole) : 0) + part;
    }
  }
  if (s in FRACTIONS) return FRACTIONS[s]!;
  try {
    return pyFloat(s);
  } catch {
    // fall through to fraction formats
  }
  if (s.includes(" ") && s.includes("/")) {
    const i = s.indexOf(" ");
    const [num, den, ...rest] = s.slice(i + 1).split("/");
    if (rest.length) throw new Error(`Unrecognized fraction format: '${s}'`);
    return pyFloat(s.slice(0, i)) + pyFloat(num!) / pyFloat(den!);
  }
  if (s.includes("/")) {
    const [num, den, ...rest] = s.split("/");
    if (rest.length) throw new Error(`Unrecognized fraction format: '${s}'`);
    return pyFloat(num!) / pyFloat(den!);
  }
  throw new Error(`Unrecognized fraction format: '${s}'`);
}

const ISO8601_PERIOD =
  /^(?<sign>[+-])?P(?!\b)(?<years>[0-9]+([,.][0-9]+)?Y)?(?<months>[0-9]+([,.][0-9]+)?M)?(?<weeks>[0-9]+([,.][0-9]+)?W)?(?<days>[0-9]+([,.][0-9]+)?D)?((?<separator>T)(?<hours>[0-9]+([,.][0-9]+)?H)?(?<minutes>[0-9]+([,.][0-9]+)?M)?(?<seconds>[0-9]+([,.][0-9]+)?S)?)?$/;

/** isodate.parse_duration(...).total_seconds(): years and months are not counted. */
function isoDurationSeconds(text: string): number | undefined {
  const m = ISO8601_PERIOD.exec(text);
  if (!m?.groups) return undefined;
  const g = (k: string) => {
    const v = m.groups![k];
    return v ? Number(v.slice(0, -1).replace(",", ".")) : 0;
  };
  const secs = g("weeks") * 604800 + g("days") * 86400 + g("hours") * 3600 + g("minutes") * 60 + g("seconds");
  return m.groups.sign === "-" ? -secs : secs;
}

/** Minutes from a number, an ISO 8601 duration or free text ("1 hr 20 mins"). */
export function getMinutes(element: unknown): number | undefined {
  if (element === null || element === undefined) throw new ElementNotFound(String(element));
  if (typeof element === "number") return Math.trunc(element);
  if (typeof element !== "string") throw new Error("Unexpected format for time element");
  if (/^\s*[+-]?\d+\s*$/.test(element)) return parseInt(element, 10);

  let text = element;
  const dash = text.indexOf("-");
  if (dash !== -1) text = text.slice(dash + 1);
  const to = text.indexOf(" to ");
  if (to !== -1) text = text.slice(to + 4);

  if (text.startsWith("P") && text.includes("T")) {
    const secs = isoDurationSeconds(text);
    if (secs !== undefined) {
      const total = Math.ceil(secs / 60);
      return total === 0 ? undefined : total;
    }
  }

  const units = TIME_REGEX.exec(text)?.groups ?? {};
  if (!Object.values(units).some(Boolean)) return undefined;
  const days = units.days ? pyFloat(units.days) : 0;
  const hours = units.hours ? extractFractional(units.hours) : 0;
  const minutes = units.minutes ? pyFloat(units.minutes) : 0;
  const seconds = units.seconds ? pyFloat(units.seconds) : 0;
  const rounded = pyRound(minutes + hours * 60 + days * 24 * 60 + seconds / 60);
  return rounded === 0 ? undefined : rounded;
}

function formatCountLabel(count: number, singular: string, plural: string): string {
  const formatted = Number.isInteger(count) ? String(count) : pyFloatStr(count);
  return `${formatted} ${count === 1 ? singular : plural}`;
}

function pyStr(x: unknown): string {
  if (typeof x === "string") return x;
  if (typeof x === "number") return Number.isInteger(x) ? String(x) : pyFloatStr(x);
  if (x && typeof x === "object") return JSON.stringify(x);
  return String(x);
}

/** "4 servings", "12 cookies", "2 dozen"… from schema recipeYield (string, number or list). */
export function getYields(element: unknown): string {
  if (element === null || element === undefined) throw new ElementNotFound(String(element));
  if (Array.isArray(element)) {
    let best = element[0];
    for (const item of element) {
      const s = pyStr(item).toLowerCase();
      const hasUnit =
        YIELD_TYPE_PATTERNS.some(([sg, pl]) => sg.test(s) || pl.test(s)) ||
        YIELD_ABBREVIATION_PATTERNS.some(([ab]) => ab.test(s));
      if (hasUnit) {
        best = item;
        break;
      }
    }
    element = best;
  }
  let serveText = pyStr(element);
  if (!serveText) throw new Error("Cannot extract yield information from empty string");

  const to = SERVE_REGEX_TO.exec(serveText);
  if (to) serveText = serveText.split(to[1]!)[1]!;

  const raw = SERVE_REGEX_NUMBER.exec(serveText)?.groups?.items || "0";
  let matched: number;
  try {
    matched = pyFloat(raw);
  } catch {
    matched = 0;
  }

  const lower = serveText.toLowerCase();
  let bestMatch: string | undefined;
  let bestLen = 0;
  for (const [sgRe, plRe, singular, plural] of YIELD_TYPE_PATTERNS) {
    const sg = sgRe.test(lower);
    const pl = plRe.test(lower);
    if (sg || pl) {
      const len = sg && pl ? Math.max(singular.length, plural.length) : sg ? singular.length : plural.length;
      if (len > bestLen) {
        bestLen = len;
        bestMatch = formatCountLabel(matched, singular, plural);
      }
    }
  }
  if (bestMatch) return bestMatch;

  for (const [re, singular, plural] of YIELD_ABBREVIATION_PATTERNS) {
    if (re.test(lower)) return formatCountLabel(matched, singular, plural);
  }
  const s = matched !== 1 ? "s" : "";
  if (SERVE_REGEX_ITEMS.test(serveText)) return formatCountLabel(matched, "item", `item${s}`);
  return formatCountLabel(matched, "serving", `serving${s}`);
}

/** Python html.unescape, applied until stable. */
export function unescapeHtml(s: string): string {
  let prev: string | undefined;
  let out = s;
  while (prev !== out) {
    prev = out;
    out = decodeHTML(out);
  }
  return out;
}

export function normalizeString(input: string): string {
  const noHtml = unescapeHtml(input).replace(/<[^>]*>/g, "");
  let cleaned = noHtml
    .replaceAll("Â ", " ")
    .replaceAll(" ", " ")
    .replaceAll("​", "")
    .replaceAll("\r\n", " ")
    .replaceAll("\n", " ")
    .replaceAll("\t", " ")
    .replaceAll("u0026#039;", "'")
    .trim();
  if (cleaned.includes("((") && cleaned.includes("))")) cleaned = cleaned.replaceAll("((", "(").replaceAll("))", ")");
  return cleaned.replace(/\s+/g, " ").trim();
}

export function csvToTags(csv: string, lowercase = false): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of csv.split(",")) {
    const tag = raw.trim();
    if (tag && !seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      tags.push(lowercase ? tag.toLowerCase() : tag);
    }
  }
  return tags;
}

export function getEquipment(items: string[]): string[] {
  return [...new Set(items)];
}

/** Host without a leading "www.", as recipe-scrapers keys its sites. */
export function getHostName(url: string): string {
  const m = /^((.+?):\/\/)?((.+?)(:(.*?))?@)?(?<host>[^:/]+)/.exec(url.replace("://www.", "://"));
  return m?.groups?.host ?? "";
}

/** Python urllib.parse.urljoin for absolute http(s) bases; returns href unchanged when it cannot resolve. */
export function urlJoin(base: string, href: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}
