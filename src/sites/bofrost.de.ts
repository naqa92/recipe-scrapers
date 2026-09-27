import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["bofrost.de"];

const NUTRIENT_NAMES: [string, string][] = [
  ["calories", "Kalorien"],
  ["fatContent", "Fett"],
  ["saturatedFatContent", "Gesättigte Fette"],
  ["carbohydrateContent", "Kohlenhydrate"],
  ["sugarContent", "Zucker"],
  ["proteinContent", "Eiweiß"],
  ["sodiumContent", "Salz"],
  ["fiberContent", "Ballaststoffe"],
];

export default class extends Scraper {
  override nutrients(): Record<string, string> {
    const container = selectOne(this.$, ".recipe-nutrations");
    const getNutrient = (name: string): string | undefined => {
      if (!container) return undefined;
      for (const row of container.find(".row").toArray()) {
        const keyEl = this.$(row).find(".col-6.recipe-nutrations-item").toArray();
        if (keyEl.length === 2) {
          const key = getText(this.$(keyEl[0]), "", true).replaceAll(":", "");
          const value = getText(this.$(keyEl[1]), "", true);
          if (key === name) return normalizeString(value);
        }
      }
      return undefined;
    };
    const out: Record<string, string> = {};
    for (const [key, name] of NUTRIENT_NAMES) {
      const v = getNutrient(name);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }
}
