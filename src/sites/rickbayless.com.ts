import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";
import { getYields } from "../utils.ts";

export const hosts = ["rickbayless.com"];

function collapseWs(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

export default class extends Scraper {
  override siteName(): string {
    return "Rick Bayless";
  }

  override author(): string {
    return "Rick Bayless";
  }

  override title(): string {
    const header = selectOne(this.$, "div.page-header");
    const h1 = header ? selectOne(this.$, "h1", header) : undefined;
    return h1 ? getText(h1, "", true) : "";
  }

  override totalTime(): number | undefined {
    return undefined;
  }

  override ingredients(): string[] {
    const div = selectOne(this.$, "div.recipe-ingredients");
    if (!div) return [];
    return div
      .find('li[itemprop="ingredients"]')
      .toArray()
      .map((el) => collapseWs(getText(this.$(el))));
  }

  override instructions(): string {
    const div = selectOne(this.$, "div.recipe-instructions");
    if (!div) return "";
    const lines: string[] = [];
    div.find("p").each((_, el) => {
      const $el = this.$(el);
      if (getText($el, "", true)) lines.push(getText($el).trim());
    });
    return lines.join("\n");
  }

  override yields(): string | undefined {
    const el = selectOne(this.$, "div.recipe-servings");
    if (!el) return undefined;
    const text = getText(el, "", true).replace("Servings:", "").trim();
    return getYields(text);
  }
}
