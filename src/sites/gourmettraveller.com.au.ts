import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["gourmettraveller.com.au"];

export default class extends Scraper {
  override category(): string | undefined {
    const label = this.$("span.related-tags__label")
      .filter((_, el) => /Recipe Course/.test(getText(this.$(el))))
      .first();
    if (!label.length) return undefined;
    const sibling = label.nextAll("span").first();
    if (!sibling.length) return undefined;
    return normalizeString(getText(sibling));
  }

  override ingredients(): string[] {
    const headings = this.$("div.recipe-ingredients__title")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))));
    const ingredients = this.schema.ingredients();
    for (const heading of headings) {
      const idx = ingredients.indexOf(heading);
      if (idx !== -1) ingredients.splice(idx, 1);
    }
    return ingredients;
  }

  override ingredientGroups() {
    return this.groupBy(".recipe-ingredients__title", ".recipe-ingredients__item");
  }
}
