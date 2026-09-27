import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText } from "../helpers.ts";

export const hosts = ["vegolosi.it"];

export default class extends Scraper {
  override title(): string {
    const el = this.$("h1").first();
    if (!el.length) throw new FieldMissing("title");
    return getText(el).trim();
  }
}
