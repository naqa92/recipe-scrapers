import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["nibbledish.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    const schemaIngredients = this.schema.ingredients();
    if (schemaIngredients.length > 1) return schemaIngredients;
    const container = selectOne(this.$, "div.recipe-ingredients");
    if (!container) return [];
    return container
      .find("li")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))));
  }

  override instructions(): string {
    const schemaIngredients = this.schema.ingredients();
    if (schemaIngredients.length > 1) return schemaIngredients.join("\n");
    const container = selectOne(this.$, "div.recipe-instructions");
    if (!container) return "";
    return container
      .find("li")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))))
      .join("\n");
  }
}
