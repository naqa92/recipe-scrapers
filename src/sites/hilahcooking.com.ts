import { Scraper } from "../scraper.ts";

export const hosts = ["hilahcooking.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".tasty-recipes-ingredients-body p", ".tasty-recipes-ingredients-body ul li");
  }
}
