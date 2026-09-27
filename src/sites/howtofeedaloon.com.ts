import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["howtofeedaloon.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".wprm-recipe-ingredient")
      .toArray()
      .map((el) => {
        const $el = this.$(el);
        const parts = [
          selectOne(this.$, ".wprm-recipe-ingredient-amount", $el),
          selectOne(this.$, ".wprm-recipe-ingredient-unit", $el),
          selectOne(this.$, ".wprm-recipe-ingredient-name", $el),
          selectOne(this.$, ".wprm-recipe-ingredient-notes", $el),
        ]
          .map((p) => (p ? getText(p, "", true) : undefined))
          .filter((p): p is string => Boolean(p));
        return parts.join(" ");
      });
  }
}
