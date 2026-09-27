import { Scraper } from "../scraper.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["lecker.de"];

export default class extends Scraper {
  override instructions(): string {
    return this.$(".bx-instruction-group__instruction-step + div p")
      .toArray()
      .map((el) => normalizeString(this.$(el).text()))
      .join("\n");
  }
}
