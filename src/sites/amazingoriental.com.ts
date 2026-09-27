import { Scraper } from "../scraper.ts";
import { getMinutes, getYields } from "../utils.ts";

export const hosts = ["amazingoriental.com"];

export default class extends Scraper {
  override title(): string {
    return this.$("h1").first().text();
  }

  override category(): string {
    return this.$("div.recipe-info .meal-type").first().text();
  }

  override totalTime(): number | undefined {
    return getMinutes(this.$("dl.prepare-time dd").first().text());
  }

  override yields(): string {
    return getYields(this.$(".person-amount").first().text());
  }

  override ingredients(): string[] {
    return this.$(".sidebar .ingredients-wrap ul li")
      .toArray()
      .map((el) => this.$(el).text().split(/\s+/).filter(Boolean).join(" "));
  }

  override instructions(): string {
    return this.$(".main-wrap ul li")
      .toArray()
      .map((el) => this.$(el).text())
      .join("\n");
  }

  override cuisine(): string {
    return this.$("div.sidebar span.category").first().text();
  }
}
