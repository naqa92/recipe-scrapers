import type { Cheerio } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { isTag } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["melloschourico.com"];

export default class extends Scraper {
  override author(): string {
    const content = this.$('meta[itemprop="author"]').first().attr("content");
    if (content === undefined) throw new FieldMissing("author");
    return normalizeString(content);
  }

  override title(): string {
    const h1 = this.$("h1.BlogItem-title").first();
    if (!h1.length) throw new FieldMissing("title");
    return normalizeString(h1.text());
  }

  private extractInformationBlocks(keyword: string): string[] {
    const keywordUpper = keyword.toUpperCase();
    const blocks = this.$("div.sqs-html-content").toArray();
    for (const block of blocks) {
      const heading = this.$(block)
        .find("h1, h2")
        .toArray()
        .find((h) => this.$(h).text().toUpperCase().includes(keywordUpper));
      if (!heading) continue;

      const list = this.findNextTag(heading, ["ul", "ol"]);
      if (list) return list.find("li").toArray().map((li) => normalizeString(this.$(li).text()));
    }
    return [];
  }

  /** bs4 `tag.find_next(name)`: the next matching tag in document order (not limited to siblings). */
  private findNextTag(from: AnyNode, tagNames: string[]): Cheerio<AnyNode> | undefined {
    const all = this.$("*").toArray();
    const idx = all.indexOf(from);
    if (idx === -1) return undefined;
    for (let i = idx + 1; i < all.length; i++) {
      const el = all[i]!;
      if (isTag(el) && tagNames.includes(el.name)) return this.$(el);
    }
    return undefined;
  }

  override ingredients(): string[] {
    return this.extractInformationBlocks("INGREDIENTS");
  }

  override instructions(): string {
    return this.extractInformationBlocks("INSTRUCTIONS").join("\n");
  }

  override yields(): undefined {
    return undefined;
  }

  override totalTime(): undefined {
    return undefined;
  }
}
