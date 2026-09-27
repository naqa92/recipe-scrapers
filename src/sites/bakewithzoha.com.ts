import { Scraper } from "../scraper.ts";

export const hosts = ["bakewithzoha.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".tasty-recipes-ingredients p strong", ".tasty-recipes-ingredients li");
  }
}
