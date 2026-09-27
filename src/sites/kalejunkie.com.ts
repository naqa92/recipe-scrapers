import { Scraper } from "../scraper.ts";

export const hosts = ["kalejunkie.com"];

export default class extends Scraper {
  override instructions(): string {
    return this.$("div.wprm-recipe-instruction-text")
      .toArray()
      .map((el) => this.$(el).text())
      .join("\n");
  }
}
