import { Scraper } from "../scraper.ts";

export const hosts = ["loveandlemons.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".wprm-recipe-ingredient")
      .toArray()
      .map((el) => this.$(el).text());
  }
}
