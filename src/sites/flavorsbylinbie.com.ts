import type { Cheerio } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";
import { getMinutes, getYields, normalizeString } from "../utils.ts";

export const hosts = ["flavorsbylinbie.com"];

export default class extends Scraper {
  override author(): string {
    const fromSchema = this.schema.author();
    if (fromSchema) return fromSchema;

    const authorLink = this.$('a[href*="/author/"]').first();
    if (authorLink.length) {
      const text = authorLink.text().trim();
      if (text) return normalizeString(text);
    }

    return "Flavors By Linbie";
  }

  override title(): string {
    const titleTag = this.$("title").first();
    if (titleTag.length) return normalizeString(getText(titleTag, " ", true));

    const h1 = this.$("h1").first();
    if (h1.length) return normalizeString(getText(h1, " ", true));

    return "";
  }

  override category(): string | undefined {
    const fromSchema = this.schema.category();
    if (fromSchema) return fromSchema;

    const meta = this.$('meta[property="article:section"]').first().attr("content");
    if (meta) return normalizeString(meta);
    return undefined;
  }

  override totalTime(): number | undefined {
    const h2s = this.$("h2").toArray();
    for (const h of h2s) {
      const text = getText(this.$(h), " ", true);
      if (text.toLowerCase().trim() === "total time") {
        const sib = this.$(h).nextAll("p").first();
        if (sib.length) {
          const value = getText(sib, " ", true);
          const minutes = tryGetMinutes(value);
          if (minutes) return minutes;
        }
      }
    }

    const paragraph = this.servingsTimeParagraph();
    if (!paragraph) return undefined;

    const total = this.extractTimeFromParagraph(paragraph, "total time:");
    if (total) return total;

    const prep = this.extractTimeFromParagraph(paragraph, "prep time:") ?? 0;
    const cook = this.extractTimeFromParagraph(paragraph, "cook time:") ?? 0;
    if (prep || cook) return prep + cook;
    return undefined;
  }

  override prepTime(): number | undefined {
    return this.extractTimeFromServingsSection("prep");
  }

  override cookTime(): number | undefined {
    return this.extractTimeFromServingsSection("cook");
  }

  override yields(): string | undefined {
    const paragraph = this.servingsTimeParagraph();
    if (paragraph) {
      const value = this.sliceField(paragraph, "serves:");
      if (value) {
        const y = tryGetYields(value);
        if (y) return y;
      }
    }

    const h2s = this.$("h2").toArray();
    for (const h of h2s) {
      const text = getText(this.$(h), " ", true);
      const normalized = text.toLowerCase().trim();
      if (normalized === "makes" || normalized === "servings" || normalized === "serves") {
        const sib = this.$(h).nextAll("p").first();
        if (sib.length) {
          const value = getText(sib, " ", true);
          if (value) {
            const y = tryGetYields(value);
            if (y) return y;
          }
        }
      }
    }

    return undefined;
  }

  private servingsTimeParagraph(): string {
    const h2s = this.$("h2").toArray();
    for (const h of h2s) {
      const text = getText(this.$(h), " ", true).toLowerCase();
      if (text.includes("servings") && text.includes("time")) {
        const sib = this.$(h).nextAll("p").first();
        if (sib.length) return getText(sib, " ", true);
      }
    }

    const ps = this.$("p").toArray();
    for (const p of ps) {
      const text = getText(this.$(p), " ", true);
      const lower = text.toLowerCase();
      if (lower.includes("serves:") && lower.includes("total time")) return text;
    }

    return "";
  }

  private sliceField(paragraph: string, label: string): string {
    const lower = paragraph.toLowerCase();
    const idx = lower.indexOf(label);
    if (idx === -1) return "";
    let value = lower.slice(idx + label.length);
    for (const delimiter of ["prep time:", "cook time:", "total time:", "serves:", "\n", "<", "<br"]) {
      const dIdx = value.indexOf(delimiter);
      if (dIdx !== -1) {
        value = value.slice(0, dIdx);
        break;
      }
    }
    return value.trim();
  }

  private normalizeTimePhrase(text: string): string {
    let value = text;
    if (value.includes(" or ")) value = value.split(" or ")[0]!.trim();
    else if (value.includes(", or ")) value = value.split(", or ")[0]!.trim();

    value = value.replaceAll("–", "-");
    if (value.includes("-")) {
      const parts = value.split("-");
      if (parts.length === 2) value = parts[1]!.trim();
    }

    const lower = value.toLowerCase();
    for (const phrase of [" on low", " on high", " on medium"]) {
      const idx = lower.indexOf(phrase);
      if (idx !== -1) {
        value = value.slice(0, idx).trim();
        break;
      }
    }

    return value;
  }

  private extractTimeFromParagraph(paragraph: string, label: string): number | undefined {
    const field = this.sliceField(paragraph, label);
    if (!field) return undefined;
    const cleaned = this.normalizeTimePhrase(field);
    return tryGetMinutes(cleaned);
  }

  private extractTimeFromServingsSection(timeType: "prep" | "cook"): number | undefined {
    const paragraph = this.servingsTimeParagraph();
    if (!paragraph) return undefined;
    return this.extractTimeFromParagraph(paragraph, `${timeType} time:`);
  }

  override image(): string | undefined {
    return this.schema.image();
  }

  override ingredients(): string[] {
    const h2s = this.$("h2").toArray();
    for (const h of h2s) {
      const text = getText(this.$(h), " ", true);
      const normalized = text.replaceAll("’", "'").replaceAll("‘", "'");
      if (normalized.toLowerCase().includes("what you'll need")) {
        const items: string[] = [];
        this.$(h)
          .nextUntil("h2")
          .filter("ul")
          .find("li")
          .each((_, li) => {
            items.push(normalizeString(getText(this.$(li), " ", true)));
          });
        return items;
      }
    }
    return [];
  }

  override instructions(): string {
    const entry = this.contentEntry();
    if (!entry) return "";

    const heading = entry
      .find("h2")
      .toArray()
      .find((h) => {
        const text = getText(this.$(h), " ", true).toLowerCase();
        return text.includes("instructions") || text.includes("how to make");
      });
    if (!heading) return "";

    const instructions: string[] = [];
    this.$(heading)
      .nextUntil("h2")
      .filter("p")
      .each((_, p) => {
        const text = normalizeString(getText(this.$(p), " ", true));
        if (text) instructions.push(text);
      });

    return instructions.join("\n");
  }

  private contentEntry(): Cheerio<AnyNode> | undefined {
    const entryContent = this.$(".entry-content").first();
    if (entryContent.length) return entryContent;
    const itemprop = this.$('[itemprop="text"]').first();
    return itemprop.length ? itemprop : undefined;
  }
}

function tryGetMinutes(value: string): number | undefined {
  try {
    return getMinutes(value);
  } catch {
    return undefined;
  }
}

function tryGetYields(value: string): string | undefined {
  try {
    return getYields(value);
  } catch {
    return undefined;
  }
}
