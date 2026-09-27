import type { AnyNode } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["jamieoliver.com"];

export default class extends Scraper {
  override instructions(): string {
    const methodHeading = this.$("h2")
      .filter((_, el) => this.$(el).text() === "Method")
      .first();
    if (!methodHeading.length) throw new FieldMissing("instructions");
    const instructionsList = this.findNext(methodHeading.get(0)!, "ol");
    if (!instructionsList) throw new FieldMissing("instructions");
    return this.$(instructionsList)
      .find("li")
      .toArray()
      .map((li) => normalizeString(this.$(li).text()))
      .join("\n");
  }

  /** bs4 `find_next(name)`: the first later element (any depth) in document order. */
  private findNext(from: AnyNode, tag: string): AnyNode | undefined {
    const all = this.$("*").toArray();
    const idx = all.indexOf(from);
    for (let i = idx + 1; i < all.length; i++) {
      const node = all[i]!;
      if (node.type === "tag" && node.name === tag) return node;
    }
    return undefined;
  }

  override ingredients(): string[] {
    return this.$(".ingredients-rich-text p.type-body")
      .toArray()
      .map((el) => normalizeString(this.$(el).text()));
  }

  override ingredientGroups() {
    return this.groupBy(".ingredients-rich-text p.type-h5", ".ingredients-rich-text p.type-body");
  }
}
