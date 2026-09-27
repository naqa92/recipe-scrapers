import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";

export const hosts = ["drinkoteket.se"];

export default class extends Scraper {
  override ingredients(): string[] {
    const items: string[] = [];
    for (const li of this.$("ul.ingredients > li").toArray()) {
      const $li = this.$(li);
      if ($li.hasClass("separator")) break;
      const text = getText($li);
      if (text) items.push(text.trim());
    }
    return items;
  }

  override yields(): string | undefined {
    return undefined;
  }
}
