import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";
import { getMinutes, normalizeString } from "../utils.ts";

export const hosts = ["grandfrais.com"];

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

export default class extends Scraper {
  private normalizeIngredient(raw: string): string {
    const cleaned = normalizeString(raw.replace(/^-+/, "").trim());
    return cleaned.replace(/^(\d+),(\d+)/, "$1.$2");
  }

  private preRequieText(needle: string): string | undefined {
    const match = this.$(".pre-requie-item")
      .toArray()
      .find((el) => getText(this.$(el)).includes(needle));
    return match ? getText(this.$(match)) : undefined;
  }

  override author(): string {
    return "Grand Frais";
  }

  override ingredients(): string[] {
    const div = this.$('div[itemprop="ingredients"]').first();
    let items = getText(div)
      .split("\n")
      .map((i) => this.normalizeIngredient(i));
    for (const [frac, val] of Object.entries(FRACTIONS)) {
      items = items.map((i) => i.replaceAll(frac, String(val)));
    }
    return items;
  }

  override cookTime(): number | undefined {
    const text = this.preRequieText("Cuisson");
    return text !== undefined ? getMinutes(text) : undefined;
  }

  override prepTime(): number | undefined {
    const text = this.preRequieText("Préparation");
    return text !== undefined ? getMinutes(text) : undefined;
  }

  override totalTime(): number | undefined {
    const cook = this.cookTime();
    const prep = this.prepTime();
    if (cook && prep) return cook + prep;
    if (prep) return prep;
    return undefined;
  }
}
