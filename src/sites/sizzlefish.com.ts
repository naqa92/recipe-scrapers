import { Scraper } from "../scraper.ts";

export const hosts = ["sizzlefish.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".rk_group_heading", ".rk_ingredients li");
  }
}
