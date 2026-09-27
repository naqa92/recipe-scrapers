import { Scraper } from "../scraper.ts";

export const hosts = ["polishfoodies.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".mv-create-ingredients h4", ".mv-create-ingredients ul li");
  }
}
