import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["culy.nl"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".ingredients h3", ".ingredients ul li[itemprop='ingredients'], .ingredients ul li");
  }

  override instructions(): string {
    return this.$("ol li")
      .toArray()
      .map((el) => getText(this.$(el), "", true))
      .join("\n");
  }
}
