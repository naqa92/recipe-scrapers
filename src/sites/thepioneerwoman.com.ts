import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["thepioneerwoman.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".ingredients-body h3", ".ingredient-lists li");
  }

  override instructions(): string {
    let instructions = this.schema.instructions();
    if (instructions === "") {
      const el = this.$(".directions").first();
      if (el.length) instructions = getText(el, "\n");
    }
    return instructions;
  }
}
