import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";
import { getYields } from "../utils.ts";

export const hosts = ["lidiasitaly.com"];

export default class extends Scraper {
  override author(): string {
    return "LIDIA'S RESTAURANT";
  }

  override title(): string {
    const el = selectOne(this.$, ".print[data-name]");
    return (el?.attr("data-name") ?? "").trim();
  }

  override image(): string | undefined {
    const el = selectOne(this.$, ".recipe-image");
    const style = el?.attr("style");
    if (!style) return undefined;
    const afterUrl = style.split("url(").at(-1)!;
    const inner = afterUrl.split(")")[0]!;
    return inner.replace(/^[\s'"]+|[\s'"]+$/g, "");
  }

  override ingredients(): string[] {
    const out: string[] = [];
    this.$(".box-ingredients ul li").each((_, el) => {
      const $el = this.$(el);
      const cls = ($el.attr("class") ?? "").split(/\s+/);
      if (!cls.includes("category")) out.push(getText($el, "", true));
    });
    return out;
  }

  override instructions(): string {
    return this.$(".box-directions .recipe-text p")
      .toArray()
      .map((el) => getText(this.$(el), "", true))
      .join("\n");
  }

  override yields(): string | undefined {
    const el = selectOne(this.$, "h3.servings");
    return el ? getYields(getText(el, "", true)) : undefined;
  }
}
