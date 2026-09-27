import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["cleaneatingkitchen.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".tasty-recipes-ingredients ul li:not(:has(strong))")
      .toArray()
      .map((el) => getText(this.$(el), " ", true));
  }

  override ingredientGroups() {
    return this.groupBy(".tasty-recipes-ingredients ul li:has(strong)", ".tasty-recipes-ingredients ul li:not(:has(strong))");
  }
}
