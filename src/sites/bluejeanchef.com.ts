import { Scraper } from "../scraper.ts";

export const hosts = ["bluejeanchef.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".wprm-recipe-ingredient-group h5", ".wprm-recipe-ingredients li");
  }
}
