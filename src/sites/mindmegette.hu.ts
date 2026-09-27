import type { Cheerio } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { isTag } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getMinutes, getYields, normalizeString } from "../utils.ts";

export const hosts = ["mindmegette.hu"];

export default class extends Scraper {
  /** bs4 `tag.find_next(name=True)`: the next tag (any name) in document order. */
  private findNextTag(from: AnyNode): Cheerio<AnyNode> | undefined {
    const all = this.$("*").toArray();
    const idx = all.indexOf(from);
    if (idx === -1) return undefined;
    for (let i = idx + 1; i < all.length; i++) {
      const el = all[i]!;
      if (isTag(el)) return this.$(el);
    }
    return undefined;
  }

  override title(): string {
    const h1 = this.$("h1.title").first();
    if (!h1.length) throw new FieldMissing("title");
    return h1.text();
  }

  override totalTime(): number | undefined {
    const span = this.$("span.spriteTime").first();
    if (!span.length) throw new FieldMissing("total time");
    const next = this.findNextTag(span.get(0)!);
    if (!next) throw new FieldMissing("total time");
    return getMinutes(next.text());
  }

  override image(): string | undefined {
    const src = this.$("img[itemprop='image'][src]").first().attr("src");
    if (src === undefined) return undefined;
    return `https://${this.host()}${src}`;
  }

  override ingredients(): string[] {
    const cart = this.$("ul.shopingCart").first();
    if (!cart.length) throw new FieldMissing("ingredients");
    return cart
      .find("li")
      .toArray()
      .map((li) => {
        const $li = this.$(li);
        const amountUnit = ($li.find("span.ingredient-measure").first().attr("title") ?? "").trim();
        const name = $li.find("span.ingredient-name").first().text().trim();
        return `${amountUnit} ${name}`.trim();
      });
  }

  override instructions(): string {
    const div = this.$("div.instructions").first();
    if (!div.length) throw new FieldMissing("instructions");
    return div
      .find("li")
      .toArray()
      .map((li) => {
        const clone = this.$(li).clone();
        clone.find("h2").remove();
        return normalizeString(clone.text());
      })
      .join("\n");
  }

  override yields(): string {
    const span = this.$("span.spritePortion").first();
    if (!span.length) throw new FieldMissing("yields");
    const next = this.findNextTag(span.get(0)!);
    if (!next) throw new FieldMissing("yields");
    return getYields(next.text());
  }
}
