import { Scraper } from "../scraper.ts";

export const hosts = ["directoalpaladar.com"];

export default class extends Scraper {
  override siteName(): string {
    return "Directo al Paladar";
  }
}
