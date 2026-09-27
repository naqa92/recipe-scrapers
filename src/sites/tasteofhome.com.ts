import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["tasteofhome.com"];

const ITEM_SELECTOR = ".ingredient-item:not(.sub-ingredient-title)";
const GROUPED_ITEM_SELECTOR = ".ingredients-list > .ingredient-item:not(.sub-ingredient-title), .sub-ingredients .ingredient-item";

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(ITEM_SELECTOR)
      .toArray()
      .map((el) => this.$(el).text().trim());
  }

  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".ingredient-item.sub-ingredient-title", GROUPED_ITEM_SELECTOR);
  }
}
