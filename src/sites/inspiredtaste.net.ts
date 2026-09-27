import { Scraper } from "../scraper.ts";

export const hosts = ["inspiredtaste.net"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".ingredient_heading", ".itr-ingredients p");
  }
}
