import { Scraper } from "../scraper.ts";
import { getYields, normalizeString } from "../utils.ts";

export const hosts = ["bigoven.com"];

export default class extends Scraper {
  override yields(): string {
    return getYields(this.$("div.yield").first().text());
  }

  override ingredientGroups() {
    return this.groupBy("span.ingredient.ingHeading", "span.ingredient:not(.ingHeading)");
  }

  override instructions(): string {
    return this.$("div.instructions")
      .first()
      .find("p")
      .toArray()
      .map((p) => normalizeString(this.$(p).text()))
      .join("\n");
  }
}
