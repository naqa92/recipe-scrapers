import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["franzoesischkochen.de"];

export default class extends Scraper {
  override author(): string {
    const content = this.$('meta[name="author"]').first().attr("content");
    if (content === undefined) throw new FieldMissing("author");
    return content;
  }

  override yields(): undefined {
    return undefined;
  }

  override instructions(): string {
    return this.schema
      .instructions()
      .split("\n")
      .filter((line) => !line.startsWith("Schritt"))
      .join("\n");
  }
}
