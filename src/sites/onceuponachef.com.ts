import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { FieldMissing } from "../schemaorg.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["onceuponachef.com"];

export default class extends Scraper {
  override author(): string {
    const el = this.$("div.postauthor").first();
    if (!el.length) throw new FieldMissing("author");
    return normalizeString(el.text());
  }

  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy(".ingredients h4", "li.ingredient");
  }
}
