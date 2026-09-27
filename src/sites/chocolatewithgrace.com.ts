import { Scraper } from "../scraper.ts";

export const hosts = ["chocolatewithgrace.com"];

export default class extends Scraper {
  override siteName(): string {
    return "Chocolate with Grace";
  }
}
