import { Scraper } from "../scraper.ts";

export const hosts = ["wellplated.com"];

export default class extends Scraper {
  override cuisine(): string {
    return this.schema.cuisine().replaceAll(",", ", ");
  }
}
