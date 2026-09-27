import { Scraper } from "../scraper.ts";

export const hosts = ["andy-cooks.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".rk_ingredients .rk_group_heading", ".rk_ingredients ul li");
  }
}
