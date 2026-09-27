import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["meatchurch.com"];

export default class extends Scraper {
  override siteName(): string {
    return "Meat Church";
  }

  override author(): string {
    return "Meat Church";
  }

  override title(): string {
    const content = this.$('meta[property="og:title"]').first().attr("content");
    if (content === undefined) throw new FieldMissing("title");
    return content;
  }

  override ingredients(): string[] {
    const article = this.$("div.article__content").first();
    if (!article.length) return [];
    const ingredients: string[] = [];
    for (const ul of article.find("ul").toArray()) {
      for (const li of this.$(ul).find("li").toArray()) {
        const text = normalizeString(this.$(li).text());
        if (text) ingredients.push(text);
      }
    }
    return ingredients;
  }

  override instructions(): string {
    const article = this.$("div.article__content").first();
    if (!article.length) return "";
    const lists = article.find("ul").toArray();
    if (!lists.length) return "";
    const lastList = lists[lists.length - 1]!;
    const steps: string[] = [];
    let sibling = lastList.nextSibling;
    while (sibling) {
      if (sibling.type === "tag" && sibling.name === "p") {
        const text = normalizeString(this.$(sibling).text());
        if (text) steps.push(text);
      }
      sibling = sibling.nextSibling;
    }
    return steps.join("\n");
  }

  override totalTime(): undefined {
    return undefined;
  }

  override yields(): undefined {
    return undefined;
  }
}
