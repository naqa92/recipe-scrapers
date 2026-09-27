import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["picnic.app"];

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const SCRIPT_PATTERN = /\{\\"recipe\\":\{\\"id\\"/;
const RECIPE_PATTERN = /(\{\\"recipe\\":\{.*locale.*?\})/;

/** Python `str.encode("utf-8")` as a string of raw bytes (one char per byte, like Python `bytes` printed as latin-1). */
function toUtf8Bytes(s: string): string {
  return Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join("");
}

/** Python `bytes.decode("unicode_escape")`: interprets backslash escapes literally present in ASCII text. */
function unicodeEscapeDecode(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|\\(.)/g, (_m, u: string, x: string, c: string) => {
    if (u) return String.fromCharCode(parseInt(u, 16));
    if (x) return String.fromCharCode(parseInt(x, 16));
    switch (c) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      default:
        return c;
    }
  });
}

/** Python `.encode("latin1").decode("utf-8")`: each code point is a raw UTF-8 byte, recombined into text. */
function fixLatin1AsUtf8(s: string): string {
  const bytes = Uint8Array.from([...s].map((ch) => ch.codePointAt(0)! & 0xff));
  return new TextDecoder("utf-8").decode(bytes);
}

function isObject(v: Json | undefined): v is { [k: string]: Json } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export default class extends Scraper {
  private recipeData: { [k: string]: Json } | undefined;
  private _recipe: { [k: string]: Json } | undefined;

  constructor(html: string, url: string) {
    super(html, url);
    const scriptTag = this.$("script")
      .toArray()
      .map((s) => this.$(s).text())
      .find((text) => SCRIPT_PATTERN.test(text));
    if (scriptTag === undefined) return;

    const match = RECIPE_PATTERN.exec(scriptTag);
    if (!match) return;
    try {
      const fixed = fixLatin1AsUtf8(unicodeEscapeDecode(toUtf8Bytes(match[1]!)));
      const parsed = JSON.parse(fixed) as Json;
      if (!isObject(parsed)) return;
      this.recipeData = parsed;
      const recipe = parsed.recipe;
      this._recipe = isObject(recipe) ? recipe : undefined;
    } catch {
      // Malformed embedded JSON: leave recipe data undefined.
    }
  }

  override instructions(): string {
    if (!this._recipe) throw new FieldMissing("instructions");
    const list = this._recipe.preparationInstructions;
    if (!Array.isArray(list)) throw new FieldMissing("instructions");
    return list
      .map((instruction) => normalizeString(isObject(instruction) && typeof instruction.body === "string" ? instruction.body : ""))
      .join("\n");
  }

  override ingredients(): string[] {
    if (!this._recipe) throw new FieldMissing("ingredients");
    const list = this._recipe.ingredients;
    if (!Array.isArray(list)) throw new FieldMissing("ingredients");
    return list.map((ingredient) => {
      if (!isObject(ingredient)) return "";
      const qty = ingredient.displayIngredientQuantity;
      const unit = ingredient.displayUnitOfMeasurement;
      const name = ingredient.name;
      const qtyStr = qty !== null && qty !== undefined ? `${String(qty)} ` : "";
      const unitStr = unit !== null && unit !== undefined ? `${String(unit)} ` : "";
      return normalizeString(`${qtyStr}${unitStr}${typeof name === "string" ? name : ""}`);
    });
  }

  override author(): string {
    return "Picnic";
  }

  override siteName(): string {
    return "Picnic";
  }

  override title(): string {
    const name = this._recipe?.name;
    if (typeof name !== "string") throw new FieldMissing("title");
    return name;
  }

  override totalTime(): number | undefined {
    const t = this._recipe?.preparationTimeInMinutes;
    return typeof t === "number" ? t : undefined;
  }

  override prepTime(): number | undefined {
    const t = this._recipe?.activePreparationTimeInMinutes;
    return typeof t === "number" ? t : undefined;
  }

  override yields(): undefined {
    return undefined;
  }

  override language(): string {
    const locale = this.recipeData?.locale;
    if (typeof locale !== "string") throw new FieldMissing("language");
    return locale;
  }
}
