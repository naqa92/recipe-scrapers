import { Scraper } from "../scraper.ts";

export const hosts = ["familyfoodonthetable.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy("h3", ".mv-create-ingredients li");
  }
}
