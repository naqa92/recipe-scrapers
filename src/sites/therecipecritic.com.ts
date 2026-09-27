import { Scraper } from "../scraper.ts";

export const hosts = ["therecipecritic.com"];

export default class extends Scraper {
  override author(): string {
    return "The Recipe Critic";
  }
}
