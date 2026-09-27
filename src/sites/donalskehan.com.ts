import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";
import { getMinutes, getYields } from "../utils.ts";

export const hosts = ["donalskehan.com"];

export default class extends Scraper {
  override author(): string | undefined {
    return this.$("img.img-fluid").first().attr("alt");
  }

  override siteName(): string {
    return "Donal Skehan";
  }

  override title(): string {
    const el = selectOne(this.$, "title");
    if (!el) throw new FieldMissing("title");
    return getText(el);
  }

  override category(): string | undefined {
    const el = selectOne(this.$, "h6.catColour.dk-label");
    if (!el) throw new FieldMissing("category");
    return getText(el);
  }

  override totalTime(): number | undefined {
    for (const el of this.$("li.list-inline-item.mb-2").toArray()) {
      const $el = this.$(el);
      if ($el.find('img[alt="time"]').length) return getMinutes(getText($el));
    }
    return undefined;
  }

  override yields(): string | undefined {
    for (const el of this.$("li.list-inline-item.mb-2").toArray()) {
      const text = getText(this.$(el));
      if (text.toLowerCase().includes("serves")) return getYields(text);
    }
    return undefined;
  }

  override image(): string | undefined {
    return this.$("img.img-fluid.shadow").first().attr("src");
  }

  override ingredients(): string[] {
    const section = selectOne(this.$, "div.tab-pane.fade.show.active#metric");
    if (!section) throw new FieldMissing("ingredients");
    const out: string[] = [];
    for (const p of section.find("p").toArray()) {
      const $p = this.$(p);
      const strong = selectOne(this.$, "strong", $p);
      if (strong && getText(strong, "", true).endsWith(":")) continue;
      const text = getText($p, " ", true);
      if (text) out.push(text);
    }
    return out;
  }

  override ingredientGroups() {
    return this.groupBy("div.tab-pane#metric p strong", "div.tab-pane#metric p:not(:has(strong))");
  }

  override instructions(): string {
    const section = selectOne(this.$, "div.recipe.steps.container-fluid");
    if (!section) throw new FieldMissing("instructions");
    return section
      .find("li.list-group-item")
      .toArray()
      .map((el) => getText(this.$(el)).trim())
      .join("\n");
  }

  override keywords(): string[] | undefined {
    const section = selectOne(this.$, "ul#tag");
    if (!section) throw new FieldMissing("keywords");
    return section
      .find("li.list-inline-item.mb-2")
      .toArray()
      .map((el) => getText(this.$(el)).trim());
  }
}
