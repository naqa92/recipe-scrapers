import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["afarmgirlsdabbles.com"];

const PARTS_SELECTOR =
  ".wprm-recipe-ingredient-amount, .wprm-recipe-ingredient-unit, .wprm-recipe-ingredient-name, .wprm-recipe-ingredient-notes";

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".wprm-recipe-ingredient")
      .toArray()
      .map((el) => {
        const text = this.$(el)
          .find(PARTS_SELECTOR)
          .toArray()
          .map((p) => getText(this.$(p), "", true))
          .filter(Boolean)
          .join(" ");
        return text.trim();
      });
  }
}
