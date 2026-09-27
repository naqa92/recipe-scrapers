import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["staysnatched.com"];

export default class extends Scraper {
  override author(): string {
    const el = selectOne(
      this.$,
      "div.wprm-recipe-block-container.wprm-recipe-block-container-columns.wprm-block-text-normal.wprm-recipe-author-container",
    );
    if (!el) return "Unknown";
    const a = selectOne(this.$, "a", el);
    if (!a) throw new FieldMissing("author");
    return getText(a);
  }
}
