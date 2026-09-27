import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["motherthyme.com"];

export default class extends Scraper {
  override siteName(): string {
    const homeLink = this.$('a[rel="home"][aria-label]').first();
    const label = homeLink.attr("aria-label");
    if (label === undefined) throw new FieldMissing("site name");
    return label;
  }
}
