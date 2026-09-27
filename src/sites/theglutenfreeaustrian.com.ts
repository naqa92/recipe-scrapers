import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText, selectOne } from "../helpers.ts";
import { getYields } from "../utils.ts";

export const hosts = ["theglutenfreeaustrian.com"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    const groups = this.groupBy(".mv-create-ingredients h4", ".mv-create-ingredients ul li");
    const title = this.schema.title();
    for (const g of groups) if (g.purpose === title) g.purpose = null;
    return groups;
  }

  override yields(): string | undefined {
    const el = selectOne(this.$, ".mv-create-title-wrap .mv-create-yield");
    return getYields(el ? getText(el) : undefined);
  }
}
