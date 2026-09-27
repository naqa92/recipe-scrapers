import { Scraper } from "../scraper.ts";
import { getMinutes } from "../utils.ts";

export const hosts = ["rachlmansfield.com"];

export default class extends Scraper {
  override totalTime(): number {
    const prepTime = getMinutes(this.schema.data.prepTime) ?? 0;
    const cookTime = getMinutes(this.schema.data.cookTime) ?? 0;
    return prepTime + cookTime;
  }
}
