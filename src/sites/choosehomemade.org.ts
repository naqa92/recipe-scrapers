import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";
import { getMinutes, getYields } from "../utils.ts";

export const hosts = ["choosehomemade.org"];

export default class extends Scraper {
  private getSummaryValue(label: string): string | undefined {
    for (const item of this.$(".recipe-layout__summary-item").toArray()) {
      const $item = this.$(item);
      const title = selectOne(this.$, ".recipe-layout__summary-item-title", $item);
      if (title && getText(title, "", true).toLowerCase().includes(label.toLowerCase())) {
        const value = selectOne(this.$, ".recipe-layout__summary-item-value", $item);
        if (value) return getText(value, "", true);
      }
    }
    return undefined;
  }

  override title(): string {
    return getText(this.$("h1.recipe-layout__content-title").first(), "", true);
  }

  override totalTime(): number | undefined {
    return getMinutes(this.getSummaryValue("Time"));
  }

  override yields(): string {
    return getYields(this.getSummaryValue("Servings"));
  }

  override category(): string | undefined {
    return this.getSummaryValue("Meal");
  }

  override keywords(): string[] {
    return this.$(".recipe-layout__badges img.recipe-layout__badge[alt]")
      .toArray()
      .map((el) => (this.$(el).attr("alt") ?? "").trim());
  }

  override author(): string {
    return "Choose Homemade";
  }

  override ingredients(): string[] {
    const out: string[] = [];
    this.$("ul.recipe-ingredients__inner-list li .recipe-ingredient__label").each((_, el) => {
      const cleaned = getText(this.$(el)).replace(/^\s+/, "");
      if (cleaned) out.push(cleaned);
    });
    return out;
  }

  override instructions(): string {
    return this.$("ol.recipe-steps__inner li .recipe-step__inner")
      .toArray()
      .map((el) => getText(this.$(el), "", true))
      .join("\n");
  }
}
