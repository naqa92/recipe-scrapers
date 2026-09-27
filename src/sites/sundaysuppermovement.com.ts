import { Scraper } from "../scraper.ts";

export const hosts = ["sundaysuppermovement.com"];

export default class extends Scraper {
  override instructions(): string {
    const container = this.$("div.wprm-recipe-instructions-container").first();
    if (!container.length) return "";
    const instructions: string[] = [];
    for (const step of container.find("li.wprm-recipe-instruction").toArray()) {
      const textDiv = this.$(step).find("div.wprm-recipe-instruction-text").first();
      if (!textDiv.length) continue;
      const text = textDiv.text().trim();
      if (text) instructions.push(text);
    }
    return instructions.join("\n");
  }
}
