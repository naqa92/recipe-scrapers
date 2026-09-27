import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["carriesexperimentalkitchen.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    const ingredients: string[] = [];
    const container = this.$("div.wprm-recipe-ingredients-container").first();
    if (!container.length) return ingredients;
    container.find("div.wprm-recipe-ingredient-group").each((_, group) => {
      const header = this.$(group).find("h4.wprm-recipe-group-name").first();
      const name = header.length ? normalizeString(header.text()) : "";
      if (name.toLowerCase().includes("equipment")) return;
      this.$(group)
        .find("li.wprm-recipe-ingredient")
        .each((_, li) => {
          ingredients.push(normalizeString(this.$(li).text()));
        });
    });
    return ingredients;
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    this.$(".wprm-recipe-ingredient-group").each((_, group) => {
      const $group = this.$(group);
      const heading = $group.find(".wprm-recipe-ingredient-group-name").first();
      const purpose = heading.length ? heading.text().trim() : null;
      if (purpose && purpose.toLowerCase().includes("equipment")) return;

      const ingredients: string[] = [];
      $group.find(".wprm-recipe-ingredient").each((_, el) => {
        const $el = this.$(el);
        const parts: string[] = [];
        const amount = $el.find(".wprm-recipe-ingredient-amount").first();
        const unit = $el.find(".wprm-recipe-ingredient-unit").first();
        const name = $el.find(".wprm-recipe-ingredient-name").first();
        const notes = $el.find(".wprm-recipe-ingredient-notes").first();
        if (amount.length) parts.push(amount.text().trim());
        if (unit.length) parts.push(unit.text().trim());
        if (name.length) parts.push(name.text().trim());
        if (notes.length) parts.push(notes.text().trim());
        ingredients.push(parts.join(" ").split(/\s+/).filter(Boolean).join(" "));
      });
      groups.push({ ingredients, purpose });
    });

    return groups.length ? groups : [{ ingredients: this.finalIngredients(), purpose: null }];
  }
}
