import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["chefnini.com"];

export default class extends Scraper {
  override author(): string {
    return "chefNini";
  }

  override title(): string {
    let title = getText(this.$("title").first()).trim();
    if (title.endsWith(" - chefNini")) title = title.slice(0, -" - chefNini".length).trimEnd();
    return title;
  }

  override totalTime(): number | undefined {
    return undefined;
  }

  override yields(): string {
    const text = getText(this.$('h3[itemprop="recipeYield"]').first());
    const m = /^Pour (\d+)/.exec(text);
    return `${m![1]} servings`;
  }

  override ingredients(): string[] {
    return this.$('li[itemprop="ingredients"]')
      .toArray()
      .map((el) => getText(this.$(el)));
  }

  override instructions(): string {
    const div = this.$('div[itemprop="recipeInstructions"]').first();
    if (!div.length) throw new FieldMissing("recipe instructions");
    const lines: string[] = [];
    div.contents().each((_, node) => {
      const text = getText(node);
      if (text.trim()) lines.push(text);
    });
    return lines.join("\n");
  }

  override ingredientGroups() {
    return this.groupBy("p strong", "li[itemprop='ingredients']");
  }
}
