import { Scraper } from "../scraper.ts";

export const hosts = ["adrianasbestrecipes.com"];

export default class extends Scraper {
  override instructions(): string {
    const instructions: string[] = [];
    this.$("div.wprm-recipe-instruction-group").each((_, group) => {
      this.$(group)
        .find("li.wprm-recipe-instruction")
        .each((_, step) => {
          const text = this.$(step).text().trim();
          if (text) instructions.push(text);
        });
    });
    return instructions.join("\n");
  }
}
