import { Scraper } from "../scraper.ts";

export const hosts = ["ameessavorydish.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    const out: string[] = [];
    for (const el of this.$(".wprm-recipe-ingredient:not(:has(strong))").toArray()) {
      const text = this.$(el)
        .find(".wprm-recipe-ingredient-amount, .wprm-recipe-ingredient-unit, .wprm-recipe-ingredient-name, .wprm-recipe-ingredient-notes")
        .toArray()
        .map((span) => this.$(span).text().trim())
        .join(" ");
      out.push(text);
    }
    return out;
  }

  override ingredientGroups() {
    return this.groupBy(".wprm-recipe-ingredient-group .wprm-recipe-ingredient-name strong", ".wprm-recipe-ingredient:not(:has(strong))");
  }
}
