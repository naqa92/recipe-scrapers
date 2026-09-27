import { isTag } from "domhandler";
import { Scraper } from "../scraper.ts";

export const hosts = ["theplantbasedschool.com"];

export default class extends Scraper {
  override instructions(): string {
    const lines: string[] = [];
    this.$(".wprm-recipe-instruction-text").each((_, instruction) => {
      for (const child of instruction.children) {
        if (isTag(child) && child.name === "span") lines.push(this.$(child).text());
      }
    });
    return lines.join("\n");
  }
}
