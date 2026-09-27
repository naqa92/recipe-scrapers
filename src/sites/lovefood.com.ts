import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";
import { getMinutes, getYields } from "../utils.ts";

export const hosts = ["lovefood.com"];

function afterFirstColon(s: string): string {
  const idx = s.indexOf(":");
  return idx === -1 ? s : s.slice(idx + 1);
}

export default class extends Scraper {
  private liContaining(label: string) {
    return this.$(`li:contains("${label}")`).first();
  }

  private timeStr(label: string): number | undefined {
    const el = this.liContaining(label);
    if (!el.length) return undefined;
    const text = afterFirstColon(getText(el, "", true)).trim();
    return getMinutes(text);
  }

  override author(): string {
    return selectOne(this.$, 'meta[name="og:article:author"]')!.attr("content")!;
  }

  override title(): string {
    return selectOne(this.$, 'meta[name="og:title"]')!.attr("content")!;
  }

  override image(): string | undefined {
    return selectOne(this.$, 'meta[name="og:image"]')?.attr("content");
  }

  override category(): string | undefined {
    const el = this.liContaining("Recipe Type:");
    if (!el.length) return undefined;
    return afterFirstColon(getText(el, "", true)).trim();
  }

  override cuisine(): string | undefined {
    const el = this.liContaining("Cuisine:");
    if (!el.length) return undefined;
    return afterFirstColon(getText(el, "", true)).trim();
  }

  override yields(): string | undefined {
    const el = this.liContaining("Serves:");
    if (!el.length) return undefined;
    return getYields(afterFirstColon(getText(el, "", true)).trim());
  }

  override ingredients(): string[] {
    return this.$('ul[name="ingredients-metric"] li')
      .toArray()
      .map((el) => getText(this.$(el), "", true));
  }

  override ingredientGroups() {
    return this.groupBy(".layout__item strong", '.layout__item ul[name="ingredients-metric"] li');
  }

  override instructions(): string {
    return this.$("div.content__step-by-step ol li")
      .toArray()
      .map((el) => getText(this.$(el), "", true))
      .join("\n");
  }

  override prepTime(): number | undefined {
    return this.timeStr("Preparation Time");
  }

  override cookTime(): number | undefined {
    return this.timeStr("Cooking Time");
  }

  override totalTime(): number | undefined {
    const prep = this.prepTime() ?? 0;
    const cook = this.cookTime() ?? 0;
    const total = prep + cook;
    return total > 0 ? total : undefined;
  }
}
