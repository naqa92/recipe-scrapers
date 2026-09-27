import { Scraper } from "../scraper.ts";

export const hosts = ["keytomylime.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".mv-create-ingredients h3", ".mv-create-ingredients ul li");
  }
}
