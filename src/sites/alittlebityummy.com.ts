import { Scraper } from "../scraper.ts";
import { getMinutes, normalizeString } from "../utils.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["alittlebityummy.com"];

export default class extends Scraper {
  override author(): string | undefined {
    const el = this.$("h4")
      .filter((_, e) => this.$(e).text().includes("Author:"))
      .first();
    if (!el.length) return undefined;
    return el.text().replace("Author:", "").trim();
  }

  override ingredients(): string[] {
    const blocks = this.$(".ingredients-tab-content div:has(b.ingredient-unit-display)").toArray();
    const seen = new Set<string>();
    const ingredients: string[] = [];
    for (const block of blocks) {
      const $block = this.$(block);
      const unitDisplay = $block.find("b.ingredient-unit-display").first();
      const nameDisplay = $block.find("span.ingredient-name-display").first();
      if (!unitDisplay.length || !nameDisplay.length) continue;

      const primaryAmount = (unitDisplay.attr("data-primary-amount") ?? "").trim();
      const primaryUnit = (unitDisplay.attr("data-primary-unit") ?? "").trim();
      const secondaryAmount = (unitDisplay.attr("data-secondary-amount") ?? "").trim();
      const secondaryUnit = (unitDisplay.attr("data-secondary-unit") ?? "").trim();

      let amountText = `${primaryAmount} ${primaryUnit}`.trim();
      if (secondaryAmount) amountText += ` (${secondaryAmount} ${secondaryUnit})`;

      const name = nameDisplay.text().trim();
      const fullIngredient = `${amountText} ${name}`.trim();

      if (!seen.has(fullIngredient)) {
        seen.add(fullIngredient);
        ingredients.push(fullIngredient);
      }
    }
    return ingredients;
  }

  override instructions(): string {
    return this.$("#method ol li")
      .toArray()
      .map((li) => normalizeString(this.$(li).text()))
      .filter((s) => s)
      .join("\n");
  }

  override ingredientGroups(): IngredientGroup[] {
    const ingredients = this.finalIngredients();
    const groups: IngredientGroup[] = [];
    let currentPurpose: string | null = null;
    let currentIngredients: string[] = [];
    let ingIdx = 0;

    const nodes = this.$(".ingredients-tab-content h4.highlighted, .ingredients-tab-content div:has(b.ingredient-unit-display)").toArray();
    for (const node of nodes) {
      const $node = this.$(node);
      if (node.type === "tag" && node.name === "h4") {
        if (currentIngredients.length) {
          groups.push({ ingredients: currentIngredients, purpose: currentPurpose });
          currentIngredients = [];
        }
        currentPurpose = $node.text().trim();
      } else if (ingIdx < ingredients.length) {
        currentIngredients.push(ingredients[ingIdx]!);
        ingIdx++;
      }
    }
    if (currentIngredients.length) groups.push({ ingredients: currentIngredients, purpose: currentPurpose });

    if (groups.length <= 1) return [{ ingredients, purpose: null }];
    return groups;
  }

  override prepTime(): number | undefined {
    return this.metaMinutes("PREP IN");
  }

  override cookTime(): number | undefined {
    return this.metaMinutes("COOKS IN");
  }

  override totalTime(): number | undefined {
    const prep = this.prepTime();
    const cook = this.cookTime();
    if (prep === undefined && cook === undefined) return undefined;
    const total = (prep ?? 0) + (cook ?? 0);
    return total || undefined;
  }

  override nutrients(): Record<string, string> | undefined {
    const meta = this.$(".recipe-nutrition").first();
    if (!meta.length) return undefined;
    let tab = meta.find(".nutrition-tab-content.current").first();
    if (!tab.length) tab = meta.find(".nutrition-tab-content").first();
    if (!tab.length) return undefined;

    const mapping: Record<string, string> = {
      calories: "calories",
      fat: "fatContent",
      saturates: "saturatedFatContent",
      protein: "proteinContent",
      carbs: "carbohydrateContent",
      sugars: "sugarContent",
      fibre: "fiberContent",
      salt: "sodiumContent",
      cholesterol: "cholesterolContent",
      "trans fat": "transFatContent",
      "unsaturated fat": "unsaturatedFatContent",
    };

    const clean = (v: string | undefined): string | undefined => {
      if (!v) return undefined;
      const digits = [...v.trim()].filter((ch) => /[\d.]/.test(ch)).join("");
      return digits || undefined;
    };

    const nutrients: Record<string, string> = {};
    for (const block of tab.find(".nutrition-block").toArray()) {
      const $block = this.$(block);
      const nameEl = $block.find(".nutrition-name").first();
      const valueEl = $block.find(".nutrition-weight").first();
      if (!nameEl.length || !valueEl.length) continue;

      const nameRaw = nameEl.text().trim().toLowerCase();
      const value = clean(valueEl.text().trim());

      let key: string | undefined;
      for (const [k, v] of Object.entries(mapping)) {
        if (nameRaw.includes(k)) {
          key = v;
          break;
        }
      }
      if (value === undefined) continue;
      nutrients[key ?? nameRaw] = value;
    }
    return Object.keys(nutrients).length ? nutrients : undefined;
  }

  private metaMinutes(label: string): number | undefined {
    const meta = this.$(".recipe-meta").first();
    if (!meta.length) return undefined;
    for (const span of meta.find("span").toArray()) {
      const $span = this.$(span);
      if ($span.text().includes(label)) {
        const value = $span.find("span").first();
        if (value.length) return getMinutes(value.text().trim().toLowerCase());
      }
    }
    return undefined;
  }
}
