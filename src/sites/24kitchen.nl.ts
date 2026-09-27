import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["24kitchen.nl"];

export default class extends Scraper {
  override ingredientGroups() {
    const groups = this.groupBy(".ingredient-list-title", ".recipe-ingredient");
    if (groups.length === 1 && groups[0]!.purpose && groups[0]!.purpose.trim() === this.schema.title()) {
      groups[0]!.purpose = null;
    }
    return groups;
  }

  override instructions(): string {
    const instructions: string[] = [];

    this.$(".preparation-step .field--name-field-text").each((_, el) => {
      const text = getText(this.$(el), "", true);
      if (!text.toLowerCase().startsWith("stap:")) instructions.push(text);
    });

    this.$(".preparation-text p").each((_, el) => {
      const text = getText(this.$(el), "", true);
      const cleaned = text.replace(/^Stap\s*\d+:?/, "").trim();
      if (cleaned) instructions.push(cleaned);
    });

    return instructions.join("\n");
  }
}
