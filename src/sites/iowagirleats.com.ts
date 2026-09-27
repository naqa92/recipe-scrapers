import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["iowagirleats.com"];

export default class extends Scraper {
  override author(): string | undefined {
    return this.$('meta[name="author"]').first().attr("content");
  }

  override instructions(): string {
    return this.$(".wprm-recipe-instruction-text")
      .toArray()
      .map((el) => getText(this.$(el)).trim())
      .join("\n");
  }

  override ingredientGroups() {
    return this.groupBy(".wprm-recipe-ingredient-group h4", ".wprm-recipe-ingredient");
  }
}
