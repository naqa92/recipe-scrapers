import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["15gram.be"];

export default class extends Scraper {
  override canonicalUrl(): string {
    const og = this.$('meta[property="og:url"]').first().attr("content");
    if (og === undefined) throw new FieldMissing("canonical url");
    return og;
  }

  override author(): string {
    return "15gram";
  }
}
