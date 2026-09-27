import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["ricetteperbimby.it"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".ricetta-ingredienti .label", ".ricetta-ingredienti .ingrediente");
  }
}
