import { Scraper } from "../scraper.ts";

export const hosts = ["bettybossi.ch"];

export default class extends Scraper {
  override siteName(): string | undefined {
    return this.author();
  }
}
