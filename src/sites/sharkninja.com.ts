import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getMinutes, getYields } from "../utils.ts";
import { getText } from "../helpers.ts";

export const hosts = ["sharkninja.com"];

/** Python `str.split(sep, maxsplit)`: at most `maxSplit` splits, the tail kept whole in the last part. */
function splitMax(text: string, sep: string, maxSplit: number): string[] {
  const parts: string[] = [];
  let rest = text;
  for (let i = 0; i < maxSplit; i++) {
    const idx = rest.indexOf(sep);
    if (idx === -1) break;
    parts.push(rest.slice(0, idx));
    rest = rest.slice(idx + sep.length);
  }
  parts.push(rest);
  return parts;
}

export default class extends Scraper {
  override author(): string | undefined {
    const el = this.$("div.recipe-author__section span.recipe-author__name").first();
    if (!el.length) return undefined;
    return getText(el, "", true).replace(/^By /, "");
  }

  override ingredients(): string[] {
    const container = this.$("div.recipe-pdp-ingredients__ingredients-body div[data-method-type]:not(.d-none)").first();
    if (!container.length) throw new FieldMissing("ingredients");
    return container
      .find("ul > li")
      .toArray()
      .map((li) => getText(this.$(li), "", true));
  }

  override instructions(): string {
    const container = this.$("div.recipe-pdp-instructions__steps div[data-method-type]:not(.d-none)").first();
    if (!container.length) throw new FieldMissing("instructions");
    const instructions: string[] = [];
    for (const step of container.find("p").toArray()) {
      const text = getText(this.$(step), " ", true);
      const parts = splitMax(text, " ", 2);
      if (parts.length === 3 && parts[0]!.toLowerCase() === "step") instructions.push(parts[2]!.trim());
    }
    return instructions.join("\n");
  }

  override yields(): string | undefined {
    const table = this.$("div.recipe-table").first();
    if (!table.length) return undefined;
    for (const cell of table.find("div.recipe-table-cell").toArray()) {
      const $cell = this.$(cell);
      const label = $cell.find("div.recipe-table-label").first();
      if (label.length && (label.attr("data-attr-icon") ?? "").toLowerCase().includes("servings")) {
        const value = $cell.find("div.recipe-table-value").first();
        if (value.length) return getYields(getText(value, "", true));
      }
    }
    return undefined;
  }

  override totalTime(): number | undefined {
    const table = this.$("div.recipe-table").first();
    if (!table.length) return undefined;
    for (const cell of table.find("div.recipe-table-cell").toArray()) {
      const $cell = this.$(cell);
      const label = $cell.find("div.recipe-table-label").first();
      if (label.length && getText(label, "", true).toLowerCase().includes("total time")) {
        const value = $cell.find("div.recipe-table-value").first();
        if (value.length) return getMinutes(getText(value, "", true));
      }
    }
    return undefined;
  }
}
