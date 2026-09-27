import { Scraper } from "../scraper.ts";
import { getMinutes, getYields } from "../utils.ts";

export const hosts = ["aldi.com.au"];

export default class extends Scraper {
  override siteName(): string {
    return "Aldi";
  }

  override author(): string | undefined {
    return this.$('meta[name="author"]').first().attr("content");
  }

  override title(): string {
    return this.$("h1").first().text();
  }

  override category(): string | undefined {
    const el = this.$("a.tab-nav--link.dropdown--list--link.m-active").first();
    if (!el.length) return undefined;
    const title = el.text();
    const i = title.indexOf(" Recipe");
    return i !== -1 ? title.slice(0, i) : undefined;
  }

  override prepTime(): number | undefined {
    return getMinutes(this.getValue(/prep/i));
  }

  override cookTime(): number | undefined {
    return getMinutes(this.getValue(/cook/i));
  }

  override totalTime(): number {
    return (this.prepTime() ?? 0) + (this.cookTime() ?? 0);
  }

  override yields(): string {
    const value = this.getValue(/(makes)|(serves)/i);
    return getYields(String(value));
  }

  override image(): string | undefined {
    const figure = this.$("figure.csc-textpic-image.csc-textpic-last").first();
    if (!figure.length) return undefined;
    const img = figure.find("img").first();
    return img.length ? img.attr("src") : undefined;
  }

  override ingredients(): string[] {
    const h2 = this.$("h2")
      .filter((_, el) => /Ingredients/.test(this.$(el).text()))
      .first();
    const list = h2.nextAll("ul").first();
    return list
      .find("li")
      .toArray()
      .map((li) => this.$(li).text().trim());
  }

  override instructions(): string {
    const list = this.$("ol").first();
    return list
      .find("li")
      .toArray()
      .map((li) => this.$(li).text().trim())
      .join("\n");
  }

  private getValue(label: RegExp): string | undefined {
    let labelEl: ReturnType<typeof this.$> | undefined;
    for (const b of this.$("b").toArray()) {
      const el = this.$(b);
      const contents = el.contents();
      if (contents.length === 1 && contents.get(0)?.type === "text" && label.test(contents.text())) {
        labelEl = el;
        break;
      }
    }
    if (!labelEl) return undefined;
    const parent = labelEl.parent();
    if (!parent.length) return undefined;
    const node = labelEl.get(0)!;
    let capture = false;
    let valueText = "";
    for (const content of parent.contents().toArray()) {
      if (content === node) {
        capture = true;
        continue;
      }
      if (!capture) continue;
      valueText += content.type === "text" ? (content as { data: string }).data : this.$(content).text();
    }
    return valueText.trim() || undefined;
  }
}
