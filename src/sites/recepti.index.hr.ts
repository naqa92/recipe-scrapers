import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText } from "../helpers.ts";

export const hosts = ["recepti.index.hr"];

export default class extends Scraper {
  override instructions(): string {
    const container = this.$("div.preparation-step-new__text div.html-container").first();
    if (!container.length) return "";

    const instructions: string[] = [];
    container.find("p").each((_, tag) => {
      const text = getText(this.$(tag), " ", true);
      if (text) instructions.push(text);
    });
    return instructions.join("\n");
  }

  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".recipe-page__ingredients__name", ".recipe-page__ingredients__item");
  }
}
