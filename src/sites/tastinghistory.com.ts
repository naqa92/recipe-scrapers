import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["tastinghistory.com"];

export default class extends Scraper {
  override siteName(): string {
    return "Tasting History";
  }

  override author(): string {
    return "Max Miller";
  }

  override title(): string {
    const h1 = this.$("h1").first();
    if (!h1.length) throw new FieldMissing("title");
    return h1.text();
  }

  override category(): string | undefined {
    const tags = this.$("a.blog-item-tag").toArray();
    if (!tags.length) return undefined;
    return tags.map((el) => this.$(el).text().trim()).join(", ");
  }

  override totalTime(): undefined {
    return undefined;
  }

  override yields(): undefined {
    return undefined;
  }

  override image(): string | undefined {
    return this.$("img[data-image]").first().attr("data-image");
  }

  override ingredients(): string[] {
    const ingredients: string[] = [];
    this.$("div.sqs-col-4.span-4 .sqs-block-content ul").each((_, ul) => {
      this.$(ul)
        .find("li")
        .each((_, li) => {
          ingredients.push(this.$(li).text().trim());
        });
    });
    return ingredients;
  }

  override ingredientGroups(): IngredientGroup[] {
    return this.groupBy("div.sqs-col-4.span-4 .sqs-block-markdown .sqs-block-content p", "div.sqs-col-4.span-4 .sqs-block-content li");
  }

  override instructions(): string {
    const list = this.$("div.sqs-col-8.span-8 .sqs-block-content ol").first();
    if (!list.length) return "";
    return list
      .find("li")
      .toArray()
      .map((li) => this.$(li).text().trim())
      .join("\n");
  }
}
