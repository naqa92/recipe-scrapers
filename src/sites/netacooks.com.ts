import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText } from "../helpers.ts";

export const hosts = ["netacooks.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    const list: string[] = [];
    this.$(".wprm-recipe-ingredient").each((_, el) => {
      const $el = this.$(el);
      const nameEl = $el.find(".wprm-recipe-ingredient-name").first();
      if (!nameEl.length) return;

      const bold = nameEl.find("strong").first();
      if (bold.length && nameEl.text().trim() === bold.text().trim()) return;

      list.push(getText($el, " ", true));
    });
    return list;
  }

  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".wprm-recipe-ingredient-group-name, .wprm-recipe-ingredient-name strong", ".wprm-recipe-ingredient:not(:has(strong))");
  }
}
