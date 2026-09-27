import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["pastificiosorrentino.com"];

export default class extends Scraper {
  override siteName(): string {
    return "Pastificio Sorrentino";
  }

  override instructions(): string {
    let instructions = this.schema.instructions();
    if (!instructions) {
      instructions = this.$(".come-preparare li")
        .toArray()
        .map((el) => normalizeString(getText(this.$(el))))
        .join("\n");
    }
    return instructions;
  }
}
