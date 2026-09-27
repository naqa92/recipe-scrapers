import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["zenbelly.com"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".tasty-recipes-ingredients-body p", ".tasty-recipes-ingredients-body ul li");
  }
}
