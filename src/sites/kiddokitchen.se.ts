import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["kiddokitchen.se"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    const headings = this.$("h3.text-2xl.font-semibold.mb-2")
      .toArray()
      .filter((h) => this.$(h).nextAll("ul").first().length);
    if (headings.length < 2) return [{ ingredients: this.finalIngredients(), purpose: null }];
    return this.groupBy("h3.text-2xl.font-semibold.mb-2", "ul li");
  }
}
