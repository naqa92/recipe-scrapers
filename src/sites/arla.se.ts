import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["arla.se"];

const PLACEHOLDER_TITLES = new Set(["Första instruktionen", "Nästa instruktion", "Sista instruktionen"]);

export default class extends Scraper {
  override ingredients(): string[] {
    const ingredients: string[] = [];
    this.$(".c-recipe__ingredients-group tr").each((_, row) => {
      const name = this.$(row).find("th").first().text().trim();
      const amount = this.$(row).find("td").first().text().trim();
      const ingredient = `${amount} ${name}`.trim();
      if (ingredient) ingredients.push(ingredient);
    });
    return ingredients;
  }

  override instructions(): string {
    return this.schema
      .instructions()
      .split("\n")
      .filter((line) => !PLACEHOLDER_TITLES.has(line))
      .join("\n");
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    this.$(".c-recipe__ingredients-group").each((_, group) => {
      const headingText = this.$(group).find("h3").first().text().trim();
      const purpose = headingText || null;

      const ingredients: string[] = [];
      this.$(group)
        .find("tr")
        .each((_, row) => {
          let name = this.$(row).find("th").first().text().trim();
          const amount = this.$(row).find("td").first().text().trim();
          if (name) name = name[0]!.toUpperCase() + name.slice(1);
          const ingredient = `${amount} ${name}`.trim();
          if (ingredient) ingredients.push(ingredient);
        });

      if (ingredients.length) groups.push({ ingredients, purpose });
    });
    return groups;
  }
}
