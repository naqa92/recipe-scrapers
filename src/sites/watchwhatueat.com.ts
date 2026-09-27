import { Scraper } from "../scraper.ts";

export const hosts = ["watchwhatueat.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".wprm-recipe-ingredient")
      .toArray()
      .map((el) =>
        this.$(el)
          .find(".wprm-recipe-ingredient-amount, .wprm-recipe-ingredient-unit, .wprm-recipe-ingredient-name, .wprm-recipe-ingredient-notes")
          .toArray()
          .map((part) => this.$(part).text().trim())
          .join(" ")
          .trim(),
      );
  }
}
