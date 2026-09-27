import { Scraper } from "../scraper.ts";

export const hosts = ["food.com"];

export default class extends Scraper {
  override siteName(): string {
    return "Food.com";
  }
}
