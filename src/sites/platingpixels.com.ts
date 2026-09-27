import { isText } from "domhandler";
import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["platingpixels.com"];

export default class extends Scraper {
  override author(): string {
    for (const el of this.$("strong").toArray()) {
      if (getText(this.$(el)) === "Author:") {
        const next = el.next;
        if (next && isText(next)) return next.data.trim();
      }
    }
    return "Plating Pixels";
  }

  override ingredientGroups() {
    return this.groupBy("h4.wprm-recipe-ingredient-group-name", "li.wprm-recipe-ingredient");
  }
}
