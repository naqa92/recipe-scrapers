import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText } from "../helpers.ts";

export const hosts = ["bakels.com.au"];

const GROUP_ELEMENT = "#tab-ingredients_1 .text-xs-left:not(:contains('Ingredient')):not(:contains('Group'))";

export default class extends Scraper {
  override author(): string {
    const siteName = this.finalSiteName();
    if (siteName === undefined) throw new FieldMissing("author");
    return siteName;
  }

  override title(): string {
    const h1 = this.$("h1").first();
    if (!h1.length) throw new FieldMissing("title");
    return h1.text();
  }

  override ingredients(): string[] {
    const div = this.$("#tab-ingredients_1");
    if (!div.length) return [];
    const results: string[] = [];
    div.find("div.row").each((_, group) => {
      this.$(group)
        .find(".text-xs-left")
        .each((_, el) => {
          const text = this.$(el).text().trim();
          if (text === "Ingredient" || text.startsWith("Group")) return;
          results.push(text);
        });
    });
    return results;
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups = this.groupBy(".group-label", GROUP_ELEMENT);
    if (groups.length === 1) groups[0]!.purpose = null;
    return groups;
  }

  override instructions(): string {
    const div = this.$("div#tab-method_1");
    if (!div.length || !div.find("p").first().length) throw new FieldMissing("instructions");
    const lines = getText(div, "\n", true).split("\n");
    const stripNumber = (step: string) => {
      const i = step.indexOf(". ");
      return i === -1 ? step : step.slice(i + 2);
    };
    return lines.map(stripNumber).join("\n");
  }

  override category(): string {
    const h4 = this.$("h4")
      .filter((_, el) => this.$(el).text() === "Category")
      .first();
    if (!h4.length) throw new FieldMissing("category");
    const p = h4.nextAll("p").first();
    if (!p.length) throw new FieldMissing("category");
    return p.text();
  }
}
