import type { Cheerio } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["recipeland.com"];

export default class extends Scraper {
  private parseIngredientRow(row: Cheerio<AnyNode>): string {
    const amount = row.find(".amount").first().text();
    const measure = row.find(".measure").first().text();
    const ingredient = row.find(".ingred").first().text();
    return normalizeString(`${amount} ${measure} ${ingredient}`);
  }

  override ingredients(): string[] {
    return this.$("#ingredient_list tbody tr")
      .toArray()
      .filter((row) => !this.$(row).find("th.i-head").first().length)
      .map((row) => this.parseIngredientRow(this.$(row)));
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    let currentGroup: string | null = null;
    let groupedIngredients: string[] = [];

    this.$("#ingredient_list tbody tr").each((_, row) => {
      const $row = this.$(row);
      const groupHeader = $row.find("th.i-head").first();
      if (groupHeader.length) {
        if (currentGroup !== null || groupedIngredients.length) {
          groups.push({ ingredients: groupedIngredients, purpose: currentGroup });
        }
        currentGroup = groupHeader.text().trim();
        groupedIngredients = [];
      } else {
        const fullIngredient = this.parseIngredientRow($row);
        if (fullIngredient) groupedIngredients.push(fullIngredient);
      }
    });

    if (currentGroup !== null || groupedIngredients.length) {
      groups.push({ ingredients: groupedIngredients, purpose: currentGroup });
    }

    return groups;
  }
}
