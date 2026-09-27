import { Scraper } from "../scraper.ts";

export const hosts = ["chefjackovens.com"];

export default class extends Scraper {
  override instructions(): string {
    const groups = this.$("div.wprm-recipe-instruction-group").toArray();
    const hasHeadings = groups.some((g) => this.$(g).find("h4").length);
    if (groups.length && hasHeadings) {
      const steps: string[] = [];
      for (const group of groups) {
        const $group = this.$(group);
        if ($group.find("h4").length) {
          for (const li of $group.find("ul.wprm-recipe-instructions li.wprm-recipe-instruction").toArray()) {
            const text = this.$(li).find(".wprm-recipe-instruction-text").first();
            if (text.length) steps.push(text.text().trim());
          }
        }
      }
      return steps.join("\n");
    }
    return this.schema.instructions();
  }
}
