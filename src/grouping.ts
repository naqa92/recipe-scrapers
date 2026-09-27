// Port of recipe_scrapers/_grouping_utils.py.
import type { CheerioAPI } from "cheerio/slim";
import { normalizeString } from "./utils.ts";

export type IngredientGroup = { ingredients: string[]; purpose: string | null };

const FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const DEFAULT_GROUPINGS: [string[], string[]][] = [
  [
    [".wprm-recipe-ingredient-group h4", ".wprm-recipe-group-name"],
    [".wprm-recipe-ingredient", ".wprm-recipe-ingredients li"],
  ],
  [
    [".tasty-recipes-ingredients-body p strong", ".tasty-recipes-ingredients h4"],
    [".tasty-recipes-ingredients-body ul li", ".tasty-recipes-ingredients ul li"],
  ],
];

export function normalizeFractions(text: string): string {
  let t = text;
  for (const [u, a] of Object.entries(FRACTIONS)) t = t.replaceAll(u, a);
  return t;
}

/** Dice coefficient on code-point bigrams, as Python slices str. */
export function scoreSentenceSimilarity(first: string, second: string): number {
  if (first === second) return 1;
  const a = [...first];
  const b = [...second];
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string[]) => new Set(s.slice(0, -1).map((c, i) => c + s[i + 1]));
  const x = bigrams(a);
  const y = bigrams(b);
  let inter = 0;
  for (const g of x) if (y.has(g)) inter++;
  return (2 * inter) / (x.size + y.size);
}

export function bestMatch(test: string, targets: string[]): string {
  const t = normalizeFractions(test);
  const scores = targets.map((x) => scoreSentenceSimilarity(t, normalizeFractions(x)));
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i]! > scores[best]!) best = i;
  return targets[best]!;
}

export function groupIngredients($: CheerioAPI, ingredients: string[], heading?: string, element?: string): IngredientGroup[] {
  if (!heading || !element) {
    outer: for (const [headings, elements] of DEFAULT_GROUPINGS) {
      for (const h of headings) {
        for (const e of elements) {
          if ($(h).length && $(e).length) {
            heading = h;
            element = e;
            break outer;
          }
        }
      }
    }
  }
  if (!heading || !element) return [{ ingredients, purpose: null }];

  const found = $(element);
  if (found.length !== ingredients.length) {
    throw new Error(`Found ${found.length} grouped ingredients but was expecting to find ${ingredients.length}.`);
  }
  const groups = new Map<string | null, string[]>();
  let current: string | null = null;
  $(`${heading}, ${element}`).each((_, el) => {
    if ($(el).is(heading!)) {
      current = normalizeString($(el).text()) || null;
      if (!groups.has(current)) groups.set(current, []);
    } else {
      const text = normalizeString($(el).text());
      if (!groups.has(current)) groups.set(current, []);
      groups.get(current)!.push(bestMatch(text, ingredients));
    }
  });
  return [...groups].filter(([, items]) => items.length).map(([purpose, items]) => ({ purpose, ingredients: items }));
}
