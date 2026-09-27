import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["scrambledandscrumptious.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$("div._33 ul[role='list'] li")
      .toArray()
      .map((el) => getText(this.$(el), "", true));
  }

  override instructions(): string {
    return this.$("div._66 ol[role='list'] li")
      .toArray()
      .map((el) => getText(this.$(el), "", true))
      .join("\n");
  }

  override ingredientGroups() {
    return this.groupBy("div._33 p", "div._33 ul[role='list'] li");
  }
}
