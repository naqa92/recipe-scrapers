import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["barefootcontessa.com"];

export default class extends Scraper {
  override author(): string {
    return "Ina Garten";
  }

  override ingredients(): string[] {
    const list: string[] = [];
    this.$("div.mb-10").each((_, div) => {
      const ul = this.$(div).find("ul.h29").first();
      if (ul.length)
        ul.find("li").each((_, li) => {
          list.push(getText(this.$(li)));
        });
    });
    return list;
  }

  override ingredientGroups() {
    return this.groupBy(".mb-10 p", ".mb-10 li");
  }

  override instructions(): string {
    const lines: string[] = [];
    this.$("div.bd4.mb-10.EntryPost__text.a-bc-blue").each((_, div) => {
      this.$(div)
        .find("p")
        .each((_, p) => {
          lines.push(normalizeString(getText(this.$(p))));
        });
    });
    return lines.join("\n");
  }
}
