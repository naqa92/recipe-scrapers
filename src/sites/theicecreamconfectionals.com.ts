import { Scraper } from "../scraper.ts";

export const hosts = ["theicecreamconfectionals.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".recipe-ingredients h3.dr-title", ".recipe-ingredient");
  }
}
