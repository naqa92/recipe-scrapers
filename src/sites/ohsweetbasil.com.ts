import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["ohsweetbasil.com"];

const PARTS_SELECTOR =
  ".wprm-recipe-ingredient-amount, .wprm-recipe-ingredient-unit, .wprm-recipe-ingredient-name, .wprm-recipe-ingredient-notes";

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".wprm-recipe-ingredient-group li.wprm-recipe-ingredient")
      .toArray()
      .filter((el) => selectOne(this.$, ".wprm-recipe-ingredient-name", this.$(el)))
      .map((el) =>
        this.$(el)
          .find(PARTS_SELECTOR)
          .toArray()
          .map((span) => getText(this.$(span), "", true))
          .filter(Boolean)
          .join(" ")
          .trim(),
      );
  }

  override ingredientGroups() {
    return this.groupBy(".wprm-recipe-ingredient-group h4", ".wprm-recipe-ingredient-group li.wprm-recipe-ingredient:has(.wprm-recipe-ingredient-name)");
  }
}
