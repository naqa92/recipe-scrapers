import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText, selectOne } from "../helpers.ts";
import { getMinutes, getYields, normalizeString } from "../utils.ts";

export const hosts = ["latelierderoxane.com"];

export default class extends Scraper {
  private getTextFromBloc(blocClass: string, tag: string): string {
    const bloc = selectOne(this.$, `div.${blocClass}.bloc_blog`);
    if (!bloc) throw new FieldMissing(blocClass);
    const el = selectOne(this.$, tag, bloc);
    if (!el) throw new FieldMissing(blocClass);
    return getText(el, "", true);
  }

  private getBlocTempsValueByIndex(index: number): string {
    const temps = selectOne(this.$, "div.bloc_temps.bloc_blog");
    if (!temps) throw new FieldMissing("bloc_temps");
    const infos = selectOne(this.$, "div.infos", temps);
    if (!infos) throw new FieldMissing("infos");
    const span = infos.find("span.valeur").toArray()[index];
    if (!span) throw new FieldMissing(`valeur[${index}]`);
    return getText(this.$(span), "", true);
  }

  override title(): string {
    return this.getTextFromBloc("bloc_titreh1", "h1");
  }

  override totalTime(): number | undefined {
    return getMinutes(this.getBlocTempsValueByIndex(0));
  }

  override prepTime(): number | undefined {
    return getMinutes(this.getBlocTempsValueByIndex(1));
  }

  override cookTime(): number | undefined {
    return getMinutes(this.getBlocTempsValueByIndex(2));
  }

  override yields(): string | undefined {
    return getYields(this.getBlocTempsValueByIndex(4));
  }

  override ingredients(): string[] {
    const out: string[] = [];
    for (const div of this.$("div.ingredient").toArray()) {
      const text = normalizeString(getText(this.$(div), "", true));
      if (text && !text.includes(":")) out.push(text);
    }
    return out;
  }

  override ingredientGroups(): IngredientGroup[] {
    const groups: IngredientGroup[] = [];
    let current: IngredientGroup = { purpose: null, ingredients: [] };
    for (const div of this.$("div.ingredient").toArray()) {
      const text = normalizeString(getText(this.$(div), "", true));
      if (!text) continue;
      if (text.includes(":")) {
        if (current.ingredients.length) groups.push(current);
        current = { purpose: text.replace(/^:+|:+$/g, ""), ingredients: [] };
      } else {
        current.ingredients.push(text);
      }
    }
    if (current.ingredients.length) groups.push(current);
    return groups;
  }

  override instructions(): string {
    const div = selectOne(this.$, "div.bloc_texte_simple.bloc_blog");
    if (!div) throw new FieldMissing("instructions");
    return div
      .find("li")
      .toArray()
      .map((li) => normalizeString(getText(this.$(li), "", true)))
      .join("\n");
  }
}
