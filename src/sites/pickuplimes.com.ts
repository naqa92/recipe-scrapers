import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText } from "../helpers.ts";

export const hosts = ["pickuplimes.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$("div.ingredient-container")
      .toArray()
      .map((el) => getText(this.$(el), " ", true));
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    let currentPurpose: string | null = null;
    let currentIngredients: string[] = [];
    for (const el of this.$("h3.pt-3, div.ingredient-container").toArray()) {
      const $el = this.$(el);
      const tagName = "tagName" in el ? (el as { tagName: string }).tagName : undefined;
      if (tagName === "h3") {
        if (currentIngredients.length) {
          groups.push({ ingredients: currentIngredients, purpose: currentPurpose });
          currentIngredients = [];
        }
        currentPurpose = getText($el, "", true);
      } else if (tagName === "div" && $el.hasClass("ingredient-container")) {
        currentIngredients.push(getText($el, " ", true));
      }
    }
    if (currentIngredients.length) groups.push({ ingredients: currentIngredients, purpose: currentPurpose });
    if (!groups.length) return [{ ingredients: this.ingredients(), purpose: null }];
    return groups;
  }
}
