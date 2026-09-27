import type { Cheerio } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { isTag } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["zaubertopf.de"];

export default class extends Scraper {
  /** bs4 `tag.find_next(name)`: the next matching tag in document order (not limited to siblings). */
  private findNextTag(from: AnyNode, tagName: string): Cheerio<AnyNode> | undefined {
    const all = this.$("*").toArray();
    const idx = all.indexOf(from);
    if (idx === -1) return undefined;
    for (let i = idx + 1; i < all.length; i++) {
      const el = all[i]!;
      if (isTag(el) && el.name === tagName) return this.$(el);
    }
    return undefined;
  }

  override ingredients(): string[] {
    for (const h2 of this.$("h2").toArray()) {
      if (this.$(h2).text().includes("Die Zutaten")) {
        const ul = this.findNextTag(h2, "ul");
        if (ul) {
          return ul
            .find("li")
            .toArray()
            .map((li) => this.$(li).text())
            .filter(Boolean)
            .map((text) => normalizeString(text));
        }
      }
    }
    throw new FieldMissing("ingredients");
  }

  override instructions(): string {
    for (const h2 of this.$("h2").toArray()) {
      if (this.$(h2).text().includes("Die Zubereitung")) {
        const ol = this.findNextTag(h2, "ol");
        if (ol) {
          return ol
            .find("li")
            .toArray()
            .map((li) => this.$(li).text())
            .filter(Boolean)
            .join("\n");
        }
      }
    }
    throw new FieldMissing("instructions");
  }
}
