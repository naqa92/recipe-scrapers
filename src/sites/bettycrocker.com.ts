import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["bettycrocker.com"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".recipeIngredients h3", ".recipeIngredients li");
  }
}
