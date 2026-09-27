import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { getText } from "../helpers.ts";
import { FieldMissing } from "../schemaorg.ts";
import { isTag, isText } from "domhandler";

export const hosts = ["goldnplump.com"];

function pyIsUpper(word: string): boolean {
  let hasCased = false;
  for (const c of word) {
    if (/\p{Ll}/u.test(c)) return false;
    if (/\p{Lu}/u.test(c)) hasCased = true;
  }
  return hasCased;
}

function isGroupHeading(text: string): boolean {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => [...w].some((c) => /[\p{L}\p{N}]/u.test(c)));
  if (!words.length) return false;
  return pyIsUpper(words[0]!);
}

export default class extends Scraper {
  override author(): string {
    return "Gold'n Plump";
  }

  override totalTime(): number | undefined {
    try {
      return this.schema.totalTime();
    } catch (e) {
      if (e instanceof FieldMissing) return undefined;
      throw e;
    }
  }

  override ingredients(): string[] {
    const container = this.$(".recipe-ingredeients .field-item p");
    if (!container.length) return [];
    const lines: string[] = [];
    container.each((_, p) => {
      this.$(p)
        .contents()
        .each((_, el) => {
          if (isTag(el) && el.name === "b") {
            const text = getText(this.$(el), "", true);
            if (!isGroupHeading(text)) lines.push(text);
          } else if (isText(el)) {
            const text = el.data.trim();
            if (text) lines.push(text);
          }
        });
    });
    return lines;
  }

  override ingredientGroups(): IngredientGroup[] {
    const container = this.$(".recipe-ingredeients .field-item p");
    if (!container.length) return [{ ingredients: this.ingredients(), purpose: null }];

    const groups: IngredientGroup[] = [];
    let currentGroup: string[] = [];
    let currentHeading: string | null = null;

    container.each((_, p) => {
      this.$(p)
        .contents()
        .each((_, el) => {
          if (isTag(el) && el.name === "b") {
            const text = getText(this.$(el), "", true);
            if (isGroupHeading(text)) {
              if (currentGroup.length) {
                groups.push({ ingredients: currentGroup, purpose: currentHeading });
                currentGroup = [];
              }
              currentHeading = text.replace(/\w\S*/g, (w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase());
            } else {
              currentGroup.push(text);
            }
          } else if (isText(el)) {
            const text = el.data.trim();
            if (text) currentGroup.push(text);
          }
        });
    });

    if (currentGroup.length) groups.push({ ingredients: currentGroup, purpose: currentHeading });

    return groups;
  }
}
