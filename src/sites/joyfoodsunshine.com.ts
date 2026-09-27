import { Scraper } from "../scraper.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["joyfoodsunshine.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$("li.wprm-recipe-ingredient")
      .toArray()
      .map((el) => normalizeString(this.$(el).text()));
  }
}
