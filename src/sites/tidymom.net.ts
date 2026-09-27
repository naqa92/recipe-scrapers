import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["tidymom.net"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".mv-create-ingredients h4", ".mv-create-ingredients li");
  }
}
