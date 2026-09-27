import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["nosalty.hu"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".p-recipe__ingredients .m-list__title", ".p-recipe__ingredients .m-list__item");
  }
}
