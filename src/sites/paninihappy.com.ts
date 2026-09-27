import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";
import { getMinutes, getYields, normalizeString } from "../utils.ts";

export const hosts = ["paninihappy.com"];

export default class extends Scraper {
  override siteName(): string {
    return "Panini Happy®";
  }

  override title(): string {
    return getText(this.$("h1.entry-title").first());
  }

  override totalTime(): number | undefined {
    const el = selectOne(this.$, "span.duration");
    return getMinutes(el ? getText(el) : undefined);
  }

  override yields(): string {
    const el = selectOne(this.$, "span.yield");
    return getYields(el ? getText(el) : undefined);
  }

  override image(): string | undefined {
    const div = selectOne(this.$, "div.hrecipe");
    if (!div) return undefined;
    const img = div.find('img[loading="lazy"]').first();
    return img.length ? img.attr("src") : undefined;
  }

  override ingredients(): string[] {
    return this.$("li.ingredient")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))));
  }

  override instructions(): string {
    return this.$("li.instruction")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))))
      .join("\n");
  }
}
