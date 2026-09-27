import { Scraper } from "../scraper.ts";

export const hosts = ["lacucinaitaliana.it"];

export default class extends Scraper {
  override author(): string {
    return "La Cucina Italiana";
  }
}
