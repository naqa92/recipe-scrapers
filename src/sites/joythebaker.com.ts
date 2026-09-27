import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText, selectOne } from "../helpers.ts";
import { getMinutes } from "../utils.ts";

export const hosts = ["joythebaker.com"];

export default class extends Scraper {
  override totalTime(): number | undefined {
    const el = selectOne(this.$, "span.tasty-recipes-total-time");
    return el ? getMinutes(getText(el)) : undefined;
  }

  override cookTime(): number | undefined {
    const el = selectOne(this.$, "span.tasty-recipes-cook-time");
    return el ? getMinutes(getText(el)) : undefined;
  }

  override prepTime(): number | undefined {
    const el = selectOne(this.$, "span.tasty-recipes-prep-time");
    return el ? getMinutes(getText(el)) : undefined;
  }

  override ingredientGroups(): IngredientGroup[] {
    const container = selectOne(this.$, "div.tasty-recipes-ingredients-body");
    if (!container) return [{ ingredients: this.finalIngredients(), purpose: null }];
    const groupTitles = container.find("p").toArray();
    const groups = container.find("ul").toArray();
    const out: IngredientGroup[] = [];
    const len = Math.min(groupTitles.length, groups.length);
    for (let i = 0; i < len; i++) {
      const ingredients = this.$(groups[i]!)
        .find("li")
        .toArray()
        .map((li) => getText(this.$(li)));
      out.push({ ingredients, purpose: getText(this.$(groupTitles[i]!)) });
    }
    return out;
  }
}
