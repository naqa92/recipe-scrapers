import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["matprat.no"];

const ITEM_SELECTOR = "li[class*='IngredientsGroup_ingredients-group__item']";
const TITLE_SELECTOR = "h3[class*='IngredientsGroup_ingredients-group__title']";

export default class extends Scraper {
  override siteName(): string {
    return "MatPrat";
  }

  override ingredients(): string[] {
    const list: string[] = [];
    this.$(ITEM_SELECTOR).each((_, li) => {
      const parts = this.$(li)
        .find("span")
        .toArray()
        .map((span) => normalizeString(getText(this.$(span), " ", true)))
        .filter(Boolean);
      const ingredient = parts.join(" ");
      if (ingredient) list.push(ingredient);
    });
    return list;
  }

  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(TITLE_SELECTOR, ITEM_SELECTOR);
  }

  override nutrients(): Record<string, string> | undefined {
    const names = this.$("td.recipe-nutritions__table-cell-name").toArray().map((el) => this.$(el).text());
    if (!names.length) return undefined;
    const values = this.$("td.recipe-nutritions__table-cell-value")
      .toArray()
      .map((el) => this.$(el).text().replaceAll(" ", " "));
    const out: Record<string, string> = {};
    for (let i = 0; i < Math.min(names.length, values.length); i++) out[names[i]!] = values[i]!;
    return out;
  }
}
