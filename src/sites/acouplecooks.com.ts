import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["acouplecooks.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".tasty-recipes-ingredients-body ul li")
      .toArray()
      .map((el) => getText(this.$(el)));
  }

  override ingredientGroups() {
    return this.groupBy(".tasty-recipes-ingredients-body p b", ".tasty-recipes-ingredients-body ul li");
  }
}
