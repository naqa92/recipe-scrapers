import { Scraper } from "../scraper.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["kookjij.nl"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.$(".checkbox span[itemprop='ingredients']")
      .toArray()
      .map((el) => normalizeString(this.$(el).text()));
  }

  override category(): string {
    return this.$(".categories li[itemprop='recipeCategory'] a")
      .toArray()
      .map((el) => this.$(el).text().trim())
      .join(", ");
  }

  override cuisine(): string | undefined {
    const el = this.$('.row [itemprop="recipeCuisine"]').first();
    return el.length ? el.text().trim() : undefined;
  }
}
