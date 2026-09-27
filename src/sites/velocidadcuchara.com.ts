import type { AnyNode } from "domhandler";
import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText, selectOne } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["velocidadcuchara.com"];

export default class extends Scraper {
  private ingredientItems(): AnyNode[] {
    return this.$(".ERSIngredients li.ingredient").toArray();
  }

  private isGroupHeader(li: AnyNode): boolean {
    const $li = this.$(li);
    const strong = selectOne(this.$, "strong", $li);
    if (!strong) return false;
    return normalizeString(getText($li)) === normalizeString(getText(strong));
  }

  override ingredients(): string[] {
    return this.ingredientItems()
      .filter((li) => !this.isGroupHeader(li))
      .map((li) => normalizeString(getText(this.$(li))));
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    let currentPurpose: string | null = null;
    let currentIngredients: string[] = [];
    for (const li of this.ingredientItems()) {
      const text = normalizeString(getText(this.$(li)));
      if (this.isGroupHeader(li)) {
        if (currentIngredients.length) groups.push({ purpose: currentPurpose, ingredients: currentIngredients });
        currentPurpose = text.replace(/:+$/, "");
        currentIngredients = [];
      } else {
        currentIngredients.push(text);
      }
    }
    if (currentIngredients.length) groups.push({ purpose: currentPurpose, ingredients: currentIngredients });
    return groups.length ? groups : [{ purpose: null, ingredients: this.ingredients() }];
  }
}
