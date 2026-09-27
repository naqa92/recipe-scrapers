import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["madamecuisine.de"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$("li.wprm-recipe-ingredient")
      .toArray()
      .map((el) => getText(this.$(el)).trim());
  }

  override instructions(): string {
    return this.$(".wprm-recipe-instruction-text")
      .toArray()
      .map((el) => getText(this.$(el)).trim())
      .join("\n");
  }

  override category(): string | undefined {
    const el = selectOne(this.$, "span.wprm-recipe-keyword");
    return el ? getText(el) : undefined;
  }

  override cuisine(): string | undefined {
    const el = selectOne(this.$, "span.wprm-recipe-cuisine");
    return el ? getText(el) : undefined;
  }
}
