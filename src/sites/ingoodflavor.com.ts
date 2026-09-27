import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["ingoodflavor.com"];

export default class extends Scraper {
  override author(): string | undefined {
    const signatureDiv = this.$("div.text-signature").first();
    const signatureText = signatureDiv.length ? signatureDiv.text().trim() : undefined;
    let schemaAuthor: string | undefined;
    try {
      schemaAuthor = this.schema.author();
    } catch {
      schemaAuthor = undefined;
    }
    if (signatureText && schemaAuthor) return `${signatureText} | ${schemaAuthor}`;
    return schemaAuthor;
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups = this.groupBy("div.dr-ingredients-list h4", ".dr-ingredient-name");
    return groups.length > 1 ? groups : [{ ingredients: this.finalIngredients(), purpose: null }];
  }
}
