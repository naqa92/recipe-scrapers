import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["receptyprevas.sk"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    const results = new Map<string, IngredientGroup>();
    const table = selectOne(this.$, "table.ingredients-table");
    if (!table) return [];
    let purpose: string | null = null;
    table.find("tr").each((_, rowEl) => {
      const row = this.$(rowEl);
      if (row.find("div.ingredient-heading").length) {
        purpose = getText(row).trim();
        results.set(purpose, { ingredients: [], purpose });
      } else {
        const nameEl = selectOne(this.$, "span.ingredient-name", row);
        const amountEl = selectOne(this.$, "span.ingredient-amount", row);
        let name = nameEl ? getText(nameEl).trim() : "";
        const amount = amountEl ? getText(amountEl).trim() : "";
        if (amount) name = `${name}: ${amount}`;
        const key = purpose ?? "";
        if (!results.has(key)) results.set(key, { ingredients: [], purpose });
        results.get(key)!.ingredients.push(name);
      }
    });
    return [...results.values()];
  }
}
