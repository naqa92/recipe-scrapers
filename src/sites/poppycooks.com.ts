import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";
import { getYields, normalizeString } from "../utils.ts";

export const hosts = ["poppycooks.com"];

export default class extends Scraper {
  override author(): string | undefined {
    const authorMeta = selectOne(this.$, 'div[itemprop="author"]');
    if (!authorMeta) throw new FieldMissing("author");
    const nameMeta = selectOne(this.$, 'meta[itemprop="name"]', authorMeta);
    const content = nameMeta?.attr("content");
    if (content === undefined) throw new FieldMissing("author");
    return normalizeString(content);
  }

  override title(): string {
    const el = selectOne(this.$, "h1.fl-post-title");
    if (!el) throw new FieldMissing("title");
    return normalizeString(getText(el));
  }

  override yields(): string | undefined {
    const el = selectOne(this.$, "div.kw-recipe-servings");
    if (!el) throw new FieldMissing("yields");
    return getYields(getText(el));
  }

  override ingredients(): string[] {
    const out: string[] = [];
    for (const section of this.$("ul.ingredients-list").toArray()) {
      for (const li of this.$(section).find("li.metric").toArray()) {
        out.push(normalizeString(getText(this.$(li))));
      }
    }
    return out;
  }

  override ingredientGroups() {
    return this.groupBy(".ingredients-groups h4", ".ingredients-list li.metric");
  }

  override instructions(): string {
    const method = selectOne(this.$, "ol.method");
    if (!method) return "";
    const out: string[] = [];
    for (const li of method.find("li").toArray()) {
      const text = normalizeString(getText(this.$(li)));
      if (text) out.push(text);
    }
    return out.join("\n");
  }

  override image(): string | undefined {
    const thumb = selectOne(this.$, "div.fl-post-thumb");
    if (!thumb) throw new FieldMissing("image");
    const img = selectOne(this.$, "img", thumb);
    if (!img) return "";
    const srcset = img.attr("data-srcset") ?? "";
    if (!srcset) return img.attr("src") ?? "";
    let best: [number, string] | undefined;
    for (const item of srcset.split(",")) {
      const parts = item.trim().split(" ");
      if (parts.length !== 2) continue;
      const [urlCandidate, widthStr] = parts as [string, string];
      const w = widthStr.replace(/w$/, "");
      if (!/^\d+$/.test(w)) continue;
      const width = parseInt(w, 10);
      if (!best || width > best[0]) best = [width, urlCandidate];
    }
    return best ? best[1] : "";
  }
}
