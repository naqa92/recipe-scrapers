import { Scraper } from "../scraper.ts";

export const hosts = ["primaledgehealth.com"];

export default class extends Scraper {
  override ingredients(): string[] {
    return this.schema.ingredients().map((ingredient) => ingredient.replaceAll("Â", ""));
  }
}
