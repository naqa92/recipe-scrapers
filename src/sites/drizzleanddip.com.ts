import { Scraper } from "../scraper.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["drizzleanddip.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".wprm-recipe-ingredient")
      .toArray()
      .map((el) => {
        const $el = this.$(el);
        const parts = [
          $el.find(".wprm-recipe-ingredient-amount").first(),
          $el.find(".wprm-recipe-ingredient-unit").first(),
          $el.find(".wprm-recipe-ingredient-name").first(),
          $el.find(".wprm-recipe-ingredient-notes").first(),
        ]
          .filter((p) => p.length)
          .map((p) => p.text().trim());
        return normalizeString(parts.join(" "));
      });
  }

  override instructions(): string {
    return this.$("div.wprm-recipe-instruction-text")
      .toArray()
      .map((el) => normalizeString(this.$(el).text()))
      .join("\n");
  }
}
