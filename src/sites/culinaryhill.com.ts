import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["culinaryhill.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$("ul.wprm-recipe-ingredients > li.wprm-recipe-ingredient")
      .toArray()
      .map((el) => getText(this.$(el), " ", true).replaceAll("▢", "").trim());
  }
}
