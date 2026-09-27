import { Scraper } from "../scraper.ts";

export const hosts = ["albert.cz"];

export default class extends Scraper {
  override author(): string {
    return "Albert";
  }

  override siteName(): string {
    return "Albert";
  }

  override instructions(): string {
    const filtered = this.schema
      .instructions()
      .split("\n")
      .filter((line) => {
        const t = line.trim();
        return !(t.endsWith(".") && /^\d+$/.test(t.slice(0, -1)));
      });
    return filtered.join("\n");
  }
}
