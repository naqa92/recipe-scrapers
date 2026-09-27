import { Scraper } from "../scraper.ts";

export const hosts = ["empirecipes.com"];

export default class extends Scraper {
  override instructions(): string {
    return this.schema
      .instructions()
      .split("\n")
      .filter((line) => !line.startsWith("Step"))
      .join("\n");
  }
}
