import type { Cheerio } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { csvToTags, getMinutes, getYields, normalizeString } from "../utils.ts";

export const hosts = ["quitoque.fr"];

export default class extends Scraper {
  private getText(element: Cheerio<AnyNode> | undefined): string | undefined {
    if (!element || !element.length) return undefined;
    return normalizeString(element.text());
  }

  private getTime(timeName: string): number | undefined {
    let totalTime: string | undefined;
    for (const time of this.$(".recipe-infos-short .item-info").toArray()) {
      const $time = this.$(time);
      if ($time.text().includes(timeName)) totalTime = this.getText($time)?.replace(timeName, "");
    }
    return totalTime === undefined ? undefined : getMinutes(totalTime);
  }

  private getNutrient(nutrientName: string): string | undefined {
    const nutrients = this.$("#portion").first();
    const label = nutrients
      .find("p")
      .filter((_, el) => this.$(el).text() === nutrientName)
      .first();
    if (!label.length) throw new FieldMissing(`nutrient: ${nutrientName}`);
    const parent = label.parent();
    return this.getText(parent.find("p.regular").first());
  }

  override canonicalUrl(): string {
    const content = this.$('meta[property="og:url"]').first().attr("content");
    if (content === undefined) throw new FieldMissing("canonical url");
    return content;
  }

  override author(): string {
    return "QuiToque";
  }

  override title(): string {
    const text = this.getText(this.$("h1.title-2").first());
    if (text === undefined) throw new FieldMissing("title");
    return text;
  }

  override keywords(): string[] {
    const productTags = this.$("#product-tags").first().find(".badge");
    const keywords = productTags
      .toArray()
      .map((tag) => this.getText(this.$(tag)) ?? "")
      .join(",");
    return csvToTags(keywords);
  }

  override category(): string | undefined {
    return this.getText(this.$(".primary-ghost").first());
  }

  override totalTime(): number | undefined {
    return this.getTime("Total");
  }

  override prepTime(): number | undefined {
    return this.getTime("En cuisine");
  }

  override yields(): string {
    const serving = this.$("#ingredients").first().find("p.body-2").first();
    return getYields(this.getText(serving));
  }

  override image(): string {
    const img = this.$(".image").first().find("img").first();
    const src = img.attr("src");
    if (src === undefined) throw new FieldMissing("image");
    return src;
  }

  override ingredients(): string[] {
    const els = [...this.$("#ingredients .ingredient-list li").toArray(), ...this.$(".kitchen-list li").toArray()];
    return els.map((el) => this.getText(this.$(el)) ?? "");
  }

  override instructions(): string {
    return this.$("#preparation-steps li")
      .toArray()
      .map((el) => this.getText(this.$(el)) ?? "")
      .join("\n");
  }

  override nutrients(): Record<string, string> {
    return {
      calories: this.getNutrient("Énergie (kCal)"),
      fatContent: this.getNutrient("Matières grasses"),
      saturatedFatContent: this.getNutrient("dont acides gras saturés"),
      carbohydrateContent: this.getNutrient("Glucides"),
      sugarContent: this.getNutrient("dont sucre"),
      fiberContent: this.getNutrient("Fibres"),
      proteinContent: this.getNutrient("Protéines"),
    } as Record<string, string>;
  }
}
