import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["cookiesandcups.com"];

export default class extends Scraper {
  override author(): string {
    const el = this.$(".post-author-detail.post-author-by .entry-author-name a").first();
    if (!el.length) throw new FieldMissing("author");
    return el.text().trim();
  }
}
