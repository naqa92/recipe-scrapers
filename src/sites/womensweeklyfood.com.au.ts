import { Scraper } from "../scraper.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["womensweeklyfood.com.au"];

export default class extends Scraper {
  override instructions(): string {
    return this.schema.instructions().replace(/\d+\.\n/g, "");
  }

  override ingredients(): string[] {
    return this.$(".recipe-ingredients__item span[itemprop='ingredients']")
      .toArray()
      .map((el) => normalizeString(this.$(el).text()));
  }

  override ingredientGroups() {
    return this.groupBy(".recipe-ingredients__title", ".recipe-ingredients__item span[itemprop='ingredients']");
  }
}
