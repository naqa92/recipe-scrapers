import { Scraper } from "../scraper.ts";
import { getYields, normalizeString } from "../utils.ts";

export const hosts = ["potatorolls.com"];

export default class extends Scraper {
  override author(): string {
    return "Martin's Famous Potato Rolls and Bread";
  }

  override ingredients(): string[] {
    return this.$('div[itemprop="ingredients recipeIngredient"] .ingredient p')
      .toArray()
      .filter((el) => !this.$(el).find("strong").length)
      .map((el) => normalizeString(this.$(el).text()));
  }

  override ingredientGroups() {
    return this.groupBy("div.ingredient > div > p > strong > em", "div.ingredient > div > p:not(:has(strong))");
  }

  override instructions(): string {
    return this.$('div[itemprop="recipeInstructions"] p')
      .toArray()
      .map((el) => normalizeString(this.$(el).text()))
      .join("\n");
  }

  override language(): string {
    return "en-US";
  }

  override yields(): string | undefined {
    const serveElement = this.$("p")
      .filter((_, el) => this.$(el).text().startsWith("Serves:"))
      .first();
    if (!serveElement.length) return undefined;
    const serves = serveElement.text().split(":").pop()!.trim();
    return getYields(serves);
  }
}
