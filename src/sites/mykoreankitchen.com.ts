import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["mykoreankitchen.com"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    const groups = this.$("div.wprm-recipe-ingredient-group").toArray();
    const results: IngredientGroup[] = [];
    let ingredientIndexBase = 0;
    const schemaIngredients = this.schema.ingredients();

    for (const group of groups) {
      const $group = this.$(group);
      const ingredientCount = $group.find("li").length + ingredientIndexBase;
      const purposeHeading = $group.find("h4.wprm-recipe-ingredient-group-name").first();
      results.push({
        ingredients: schemaIngredients.slice(ingredientIndexBase, ingredientCount),
        purpose: purposeHeading.length ? purposeHeading.text() : null,
      });
      ingredientIndexBase = ingredientCount;
    }
    return results;
  }
}
