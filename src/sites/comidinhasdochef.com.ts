import { Scraper } from "../scraper.ts";

export const hosts = ["comidinhasdochef.com"];

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".content-text-shadow h2.subtitle", ".content-text-shadow ul li");
  }

  override instructions(): string {
    const instructions = this.schema.instructions();
    return instructions
      .split("\n")
      .filter((line) => !line.toLowerCase().startsWith("passo"))
      .join("\n");
  }
}
