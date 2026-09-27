import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";

export const hosts = ["cookomix.com"];

export default class extends Scraper {
  override instructions(): string {
    const container = selectOne(this.$, ".instructions.dsb-select");
    const instructions: string[] = [];
    if (container) {
      for (const child of container.children().toArray()) {
        if (!("tagName" in child)) continue;
        const tagName = (child as { tagName: string }).tagName;
        if (tagName === "h2") {
          const text = getText(this.$(child));
          if (text) instructions.push(text);
        } else if (tagName === "ol") {
          for (const li of this.$(child).find("li").toArray()) {
            const text = getText(this.$(li));
            if (text) instructions.push(text);
          }
        }
      }
    }
    return instructions.join("\n");
  }
}
