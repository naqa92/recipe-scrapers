import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["simplegreensmoothies.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    const out: string[] = [];
    this.$(".wprm-recipe-ingredient").each((_, el) => {
      const $el = this.$(el);
      const parts = [
        selectOne(this.$, ".wprm-recipe-ingredient-amount", $el),
        selectOne(this.$, ".wprm-recipe-ingredient-unit", $el),
        selectOne(this.$, ".wprm-recipe-ingredient-name", $el),
        selectOne(this.$, ".wprm-recipe-ingredient-notes", $el),
      ].map((e) => (e ? getText(e, "", true) : undefined));
      out.push(
        parts
          .filter((p): p is string => Boolean(p))
          .join(" "),
      );
    });
    return out;
  }
}
