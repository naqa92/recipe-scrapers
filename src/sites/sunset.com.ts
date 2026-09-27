import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["sunset.com"];

export default class extends Scraper {
  override ingredientGroups(): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    let currentGroup: string[] = [];
    let currentPurpose: string | null = null;

    this.$(".recipe-ingredients .cooked-single-ingredient").each((_, element) => {
      const $el = this.$(element);
      if ($el.hasClass("cooked-heading")) {
        if (currentGroup.length) groups.push({ ingredients: currentGroup, purpose: currentPurpose });
        currentGroup = [];
        currentPurpose = normalizeString($el.text());
      } else if ($el.hasClass("cooked-ingredient")) {
        const ingredient = getText($el, " ", true).split(/\s+/).filter(Boolean).join(" ");
        currentGroup.push(normalizeString(ingredient));
      }
    });

    if (currentGroup.length) groups.push({ ingredients: currentGroup, purpose: currentPurpose });
    return groups;
  }
}
