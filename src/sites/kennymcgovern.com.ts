import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["kennymcgovern.com"];

export default class extends Scraper {
  override instructions(): string {
    return this.$(".wprm-recipe-instruction-text")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))))
      .join("\n");
  }
}
