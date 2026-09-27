import type { Cheerio } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["vegansociety.com"];

export default class extends Scraper {
  private findContentHeading(expectedTitle: string): Cheerio<AnyNode> | undefined {
    const heading = this.$("h2, h3")
      .toArray()
      .find((h) => this.$(h).text().includes(expectedTitle));
    return heading ? this.$(heading) : undefined;
  }

  private findContentList(expectedTitle: string, ordered: boolean): Cheerio<AnyNode> | undefined {
    const heading = this.findContentHeading(expectedTitle);
    if (!heading) return undefined;
    const list = heading.nextAll(ordered ? "ol" : "ul").first();
    return list.length ? list : undefined;
  }

  override author(): string {
    const instructionsList = this.findContentList("Method", true);
    if (instructionsList) {
      const authors: string[] = [];
      instructionsList.nextAll("p").each((_, p) => {
        const emphasis = this.$(p).find("em").first();
        if (emphasis.length && emphasis.text().includes(" by ")) authors.push(emphasis.text().trim());
      });
      if (authors.length) return authors.join("; ");
    }

    const siteName = this.finalSiteName();
    if (siteName === undefined) throw new FieldMissing("site name");
    return siteName;
  }

  override ingredients(): string[] {
    const list = this.findContentList("Ingredients", false);
    if (!list) throw new FieldMissing("Could not find ingredients.");
    return list
      .find("li")
      .toArray()
      .map((li) => this.$(li).text().trim());
  }

  override instructions(): string {
    const list = this.findContentList("Method", true);
    if (!list) throw new FieldMissing("Could not find instructions.");
    return list
      .find("li")
      .toArray()
      .map((li) => this.$(li).text().trim())
      .join("\n");
  }
}
