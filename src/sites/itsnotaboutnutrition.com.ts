import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["itsnotaboutnutrition.com"];

export default class extends Scraper {
  override instructions(): string {
    const instructions: string[] = [];
    for (const item of this.$(".wprm-recipe-instruction").toArray()) {
      const textElem = selectOne(this.$, ".wprm-recipe-instruction-text", this.$(item));
      if (textElem) {
        const text = getText(textElem, "", true);
        if (text) instructions.push(text);
      }
    }
    return instructions.join("\n");
  }
}
