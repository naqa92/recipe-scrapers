import type { Cheerio } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getMinutes, getYields, normalizeString } from "../utils.ts";
import { getText } from "../helpers.ts";

export const hosts = ["keukenliefde.nl"];

export default class extends Scraper {
  override author(): string {
    const content = this.$('meta[name="author"]').first().attr("content");
    if (content === undefined) throw new FieldMissing("author");
    return content;
  }

  override title(): string {
    const content = this.$('meta[property="og:title"]').first().attr("content");
    if (content === undefined) throw new FieldMissing("title");
    return content;
  }

  override category(): string {
    const el = this.$("div.article-meta-item.sp.gerecht").first();
    if (!el.length) throw new FieldMissing("category");
    return getText(el);
  }

  override totalTime(): number | undefined {
    const el = this.$("div.article-meta-item.sp.tijd").first();
    if (!el.length) return undefined;
    return getMinutes(getText(el));
  }

  override yields(): string | undefined {
    const el = this.$("div.article-meta-item.sp.aantal").first();
    if (!el.length) return undefined;
    return getYields(getText(el));
  }

  override ingredients(): string[] {
    const container = this.$("div#clipboard-ingredients").first();
    if (container.length) return this.processIngredients(container);

    const header = this.$("strong")
      .filter((_, el) => this.$(el).text() === "Ingrediënten")
      .first();
    if (header.length) {
      const ul = header.parent().nextAll("ul").first();
      return this.processIngredients(ul);
    }

    throw new FieldMissing("Could not find ingredients.");
  }

  private processIngredients(container: Cheerio<AnyNode>): string[] {
    return container
      .find("li")
      .toArray()
      .map((li) => normalizeString(getText(this.$(li))));
  }

  override instructions(): string {
    const preparation = this.$("div.preparation").first();
    if (preparation.length) {
      const items = [...preparation.find("p").toArray(), ...preparation.find("li").toArray()];
      return this.normalizeInstructions(items);
    }

    const heading = this.$("strong")
      .filter((_, el) => this.$(el).text() === "Bereiding")
      .first();
    if (heading.length) {
      const parent = heading.parent();
      const items = [parent.get(0)!, ...parent.nextAll("p").toArray()];
      return this.normalizeInstructions(items);
    }

    throw new FieldMissing("Could not find instructions.");
  }

  private normalizeInstructions(items: AnyNode[]): string {
    return items
      .map((item) => normalizeString(getText(this.$(item))))
      .filter(Boolean)
      .join("\n");
  }
}
