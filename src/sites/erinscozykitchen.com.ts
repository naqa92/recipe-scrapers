import { Scraper } from "../scraper.ts";

export const hosts = ["erinscozykitchen.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".recipe-ingredients .dr-title", ".recipe-ingredient");
  }
}
