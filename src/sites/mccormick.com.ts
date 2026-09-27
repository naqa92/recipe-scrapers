import { Scraper } from "../scraper.ts";

export const hosts = ["mccormick.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".recipe-about-list .substitutions-title", ".recipe-about-list li:not(.substitutions-title):not(.substitutions-content li)");
  }

  override instructions(): string {
    return this.schema
      .instructions()
      .split("\n")
      .filter((line) => !line.toLowerCase().startsWith("step"))
      .join("\n");
  }
}
