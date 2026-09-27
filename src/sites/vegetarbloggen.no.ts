import { Scraper } from "../scraper.ts";

export const hosts = ["vegetarbloggen.no"];

export default class extends Scraper {
  override siteName(): string {
    return "Vegetarbloggen";
  }

  override instructions(): string {
    return this.schema.instructions().trim();
  }
}
