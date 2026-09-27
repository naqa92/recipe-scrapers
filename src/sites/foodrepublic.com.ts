import { Scraper } from "../scraper.ts";
import { getYields } from "../utils.ts";

export const hosts = ["foodrepublic.com"];

export default class extends Scraper {
  override yields(): string {
    const servingsDiv = this.$("div.recipe-card-servings").first();
    const servingsAmount = servingsDiv.length ? servingsDiv.find("div.recipe-card-amount").first().text() : "0";
    return getYields(servingsAmount);
  }

  override ingredientGroups() {
    return this.groupBy(".recipe-ingredients .ingredient-section", ".recipe-ingredients li:not(.ingredient-section)");
  }
}
