import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["briceletbaklava.ch"];

export default class extends Scraper {
  override siteName(): string {
    const og = this.$('meta[property="og:site_name"]').first().attr("content");
    if (og === undefined) throw new FieldMissing("site name");
    return normalizeString(og);
  }

  override title(): string {
    const el = selectOne(this.$, "h1.Post-title");
    if (!el) throw new FieldMissing("title");
    return getText(el).trim();
  }

  override category(): string | undefined {
    return this.$("a.Post-tag")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))))
      .join("\n");
  }

  override yields(): string | undefined {
    const post = selectOne(this.$, ".Post-body");
    if (!post) throw new FieldMissing("yields");
    const sections = post.find(".ob-section.ob-section-html").toArray();
    const p = sections.length > 1 ? selectOne(this.$, "p", this.$(sections[1]!)) : undefined;
    if (!p) throw new FieldMissing("yields");
    return normalizeString(getText(p));
  }

  override instructions(): string {
    const post = selectOne(this.$, ".Post-body");
    if (!post) throw new FieldMissing("instructions");
    return post
      .find("ul")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))))
      .join("\n");
  }

  override ingredients(): string[] {
    const post = selectOne(this.$, ".Post-body");
    if (!post) throw new FieldMissing("ingredients");
    const sections = post.find(".ob-section.ob-section-html").toArray();
    if (sections.length < 2) return [];
    return this.$(sections[1]!)
      .find("b")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))));
  }

  override author(): string {
    return "Michel/Bricelet & Baklava";
  }
}
