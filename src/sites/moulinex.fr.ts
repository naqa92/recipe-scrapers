import { Scraper } from "../scraper.ts";

export const hosts = ["moulinex.fr"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.schema.ingredients().map((ingredient) => ingredient.replace(/([0-9])([^ .0-9])/g, "$1 $2"));
  }

  override siteName(): string {
    return "Moulinex";
  }
}
