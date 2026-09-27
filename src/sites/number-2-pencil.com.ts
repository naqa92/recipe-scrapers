import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["number-2-pencil.com"];

export default class extends Scraper {
  override category(): string | undefined {
    const fromSchema = this.schema.category();
    if (fromSchema) return fromSchema;
    const div = selectOne(this.$, "span.entry-categories");
    if (!div) return undefined;
    return div
      .find("a[href]")
      .toArray()
      .map((el) => getText(this.$(el)))
      .join(", ");
  }
}
