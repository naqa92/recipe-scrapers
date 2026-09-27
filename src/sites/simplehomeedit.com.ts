import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText } from "../helpers.ts";

export const hosts = ["simplehomeedit.com"];

export default class extends Scraper {
  override instructions(): string {
    const instructions: string[] = [];
    for (const li of this.$("div.wprm-recipe-instructions-container li.wprm-recipe-instruction").toArray()) {
      const text = getText(this.$(li), " ", true);
      if (text) instructions.push(text);
    }
    if (!instructions.length) throw new FieldMissing("Could not find instructions.");
    return instructions.join("\n");
  }
}
