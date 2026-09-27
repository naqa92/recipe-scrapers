import { Scraper } from "../scraper.ts";

export const hosts = ["thevintagemixer.com"];

export default class extends Scraper {
  override siteName(): string {
    return "Vintage Mixer";
  }
}
