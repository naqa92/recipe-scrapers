import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["kfoods.com"];

export default class extends Scraper {
  override language(): string {
    // HTML meta lang attribute is in place, but does not reliably describe the recipe language.
    throw new FieldMissing("language");
  }

  override ingredients(): string[] {
    const data = this.schema.data.recipeIngredient;
    if (Array.isArray(data) && data.length === 1) {
      // The HTML parser normalizes CRLF/CR line endings to LF before this text is read.
      const combined = typeof data[0] === "string" ? data[0].replace(/\r\n/g, "\n").replace(/\r/g, "\n") : data[0];
      if (typeof combined === "string" && combined.includes("\n")) return combined.split("\n");
    }
    return Array.isArray(data) ? data.map((x) => String(x)) : [];
  }

  override instructions(): string {
    return this.schema
      .instructions()
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
  }
}
