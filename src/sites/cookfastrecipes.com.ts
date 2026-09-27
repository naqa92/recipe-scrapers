import { Scraper } from "../scraper.ts";

export const hosts = ["cookfastrecipes.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".ingredients-list h4", ".ingredients-list .ingredient-item label");
  }
}
