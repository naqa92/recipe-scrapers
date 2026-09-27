import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["headbangerskitchen.com"];

export default class extends Scraper {
  override siteName(): string {
    const og = this.$('meta[property="og:site_name"]').first().attr("content");
    if (og === undefined) throw new FieldMissing("site name");
    return og;
  }
}
