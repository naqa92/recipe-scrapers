import type { AnyNode } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["rosannapansino.com"];

export default class extends Scraper {
  /** bs4 `find_next(name)`: the first later element (any depth, in document order) matching `predicate`. */
  private findNext(from: AnyNode, predicate: (node: AnyNode) => boolean): AnyNode | undefined {
    const all = this.$("*").toArray();
    const idx = all.indexOf(from);
    for (let i = idx + 1; i < all.length; i++) {
      const node = all[i]!;
      if (predicate(node)) return node;
    }
    return undefined;
  }

  override title(): string {
    const content = this.$('meta[property="og:title"]').first().attr("content");
    if (content === undefined) throw new FieldMissing("title");
    return content;
  }

  override totalTime(): undefined {
    return undefined;
  }

  override ingredients(): string[] {
    const recipeLeft = this.$("div.recipe-left").first();
    if (!recipeLeft.length) throw new FieldMissing("ingredients");
    const em = this.findNext(recipeLeft.get(0)!, (n) => n.type === "tag" && n.name === "em" && this.$(n).text() === "Ingredients");
    if (!em) throw new FieldMissing("ingredients");
    const ul = this.$(em).nextAll("ul").first();
    if (!ul.length) throw new FieldMissing("ingredients");
    return ul
      .find("li")
      .toArray()
      .map((li) => normalizeString(this.$(li).text()));
  }

  override instructions(): string {
    const recipeRight = this.$("div.recipe-right").first();
    if (!recipeRight.length) throw new FieldMissing("instructions");
    const ol = this.findNext(recipeRight.get(0)!, (n) => n.type === "tag" && n.name === "ol");
    if (!ol) throw new FieldMissing("instructions");
    return this.$(ol)
      .find("li")
      .toArray()
      .map((li) => normalizeString(this.$(li).text()))
      .join("\n");
  }
}
