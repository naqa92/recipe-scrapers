import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["hassanchef.com"];

function pyTitle(s: string): string {
  return s.replace(/[A-Za-z]+/g, (word) => word[0]!.toUpperCase() + word.slice(1).toLowerCase());
}

export default class extends Scraper {
  override author(): string {
    const author = this.schema.author();
    if (author === undefined) throw new FieldMissing("author");
    return pyTitle(author);
  }

  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy('#recipe-card p[style*="font-style: italic"]', '#recipe-card ul[itemprop="recipeIngredient"] li');
  }
}
