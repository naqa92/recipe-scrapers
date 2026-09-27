import { Scraper } from "../scraper.ts";
import type { IngredientGroup } from "../grouping.ts";
import { normalizeString } from "../utils.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["kuchynalidla.sk"];

// The HTML parser normalizes CRLF/CR line endings to LF before this text is read.
function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function splitByBigGap(text: string): string[] {
  return normalizeNewlines(text)
    .split(/\n{3,10}/)
    .filter((c) => normalizeString(c));
}

export default class extends Scraper {
  override yields(): string {
    const y = this.schema.yields();
    if (y === undefined) throw new FieldMissing("yields");
    return y.replaceAll("servings", "porcií").replaceAll("serving", "porcia");
  }

  override ingredientGroups(): IngredientGroup[] {
    const raw = this.schema.data.recipeIngredient;
    const combined = (Array.isArray(raw) ? raw.map((x) => String(x)).join("") : typeof raw === "string" ? raw : "").replaceAll("<br>", "");
    const chunks = splitByBigGap(combined);

    if (chunks.length === 1) {
      return [{ ingredients: chunks[0]!.split(/\r\n|\r|\n/), purpose: null }];
    }

    const pairs = chunks.length % 2 === 1 ? chunks.slice(1) : chunks;
    const groups: IngredientGroup[] = [];
    for (let i = 0; i < pairs.length; i += 2) {
      const purpose = pairs[i] ?? null;
      const ingredients = (pairs[i + 1] ?? "")
        .split(/\r\n|\r|\n/)
        .map(normalizeString)
        .filter(Boolean);
      groups.push({ ingredients, purpose });
    }
    return groups;
  }

  override ingredients(): string[] {
    return this.ingredientGroups().flatMap((g) => g.ingredients);
  }

  override instructions(): string {
    return splitByBigGap(this.schema.instructions())
      .map(normalizeString)
      .join("\n");
  }
}
