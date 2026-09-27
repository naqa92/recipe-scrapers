import { Scraper } from "../scraper.ts";

export const hosts = ["tudogostoso.com.br"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".recipe-ingredients-subtitle", ".recipe-ingredients-item");
  }
}
