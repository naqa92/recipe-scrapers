import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText, selectOne } from "../helpers.ts";
import type { AnyNode } from "domhandler";

export const hosts = ["corriecooks.com"];

const PARTS = ".wprm-recipe-ingredient-amount, .wprm-recipe-ingredient-unit, .wprm-recipe-ingredient-name, .wprm-recipe-ingredient-notes";

export default class extends Scraper {
  private parseIngredient(el: AnyNode): { text: string | undefined; isHeading: boolean } {
    const $el = this.$(el);
    const name = selectOne(this.$, ".wprm-recipe-ingredient-name", $el);
    if (!name) return { text: undefined, isHeading: false };
    const hasAmount = !!selectOne(this.$, ".wprm-recipe-ingredient-amount", $el);
    const hasUnit = !!selectOne(this.$, ".wprm-recipe-ingredient-unit", $el);
    const isHeading = !hasAmount && !hasUnit && getText(name, "", true).endsWith(":");
    const text = $el
      .find(PARTS)
      .toArray()
      .map((e) => getText(this.$(e), " ", true))
      .join(" ")
      .trim();
    return { text: text || undefined, isHeading };
  }

  override ingredients(): string[] {
    const out: string[] = [];
    this.$(".wprm-recipe-ingredient").each((_, el) => {
      const { text, isHeading } = this.parseIngredient(el);
      if (text && !isHeading) out.push(text);
    });
    return out;
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    let current: IngredientGroup | undefined;
    this.$(".wprm-recipe-ingredient").each((_, el) => {
      const { text, isHeading } = this.parseIngredient(el);
      if (!text) return;
      if (isHeading) {
        current = { purpose: text, ingredients: [] };
        groups.push(current);
        return;
      }
      if (!current) {
        current = { purpose: null, ingredients: [] };
        groups.push(current);
      }
      current.ingredients.push(text);
    });
    return groups;
  }
}
