import { Scraper } from "../scraper.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["justonecookbook.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$("li.wprm-recipe-ingredient")
      .toArray()
      .map((li) => {
        const spans = this.$(li)
          .find("span")
          .filter((_, el) => this.$(el).attr("class") !== "wprm-checkbox-container")
          .toArray()
          .slice(1);
        return spans.map((span) => normalizeString(this.$(span).text())).join(" ");
      });
  }
}
