import { Scraper } from "../scraper.ts";

export const hosts = ["shelikesfood.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".tasty-recipes-ingredients p", ".tasty-recipes-ingredients ul li");
  }
}
