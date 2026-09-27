import { Scraper } from "../scraper.ts";

export const hosts = ["misya.info"];

export default class extends Scraper {
  override siteName(): string {
    return "Ricette di Misya";
  }
}
