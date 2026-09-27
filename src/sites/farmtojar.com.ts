import { Scraper } from "../scraper.ts";

export const hosts = ["farmtojar.com"];

export default class extends Scraper {
  override author(): string | undefined {
    return this.$('meta[name="author"]').first().attr("content");
  }
}
