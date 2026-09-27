import { Scraper } from "../scraper.ts";

export const hosts = ["lazycatkitchen.com"];

export default class extends Scraper {
  override ingredientGroups() {
    const groups = this.groupBy(".ingredients-section p", ".ingredients-section li");
    if (groups.length === 1 && (!groups[0]!.purpose || groups[0]!.purpose.trim().toLowerCase() === "ingredients")) {
      return [{ ingredients: groups[0]!.ingredients, purpose: null }];
    }
    return groups;
  }
}
