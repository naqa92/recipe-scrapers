import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["insanelygoodrecipes.com"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".ingredient-item-group-title", ".ingredient-item:not(.ingredient-item-group)");
  }
}
