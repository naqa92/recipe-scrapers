import { Scraper } from "../scraper.ts";

export const hosts = ["abuelascounter.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".ingredient-item-group-title", ".wpzoom-rcb-ingredient-name");
  }
}
