import { Scraper } from "../scraper.ts";

export const hosts = ["inbloombakery.com"];

export default class extends Scraper {
  override siteName(): string {
    return "In Bloom Bakery";
  }
}
