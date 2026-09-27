import { Scraper } from "../scraper.ts";
import { isObject } from "../schemaorg.ts";

export const hosts = ["ricette.giallozafferano.it"];

export default class extends Scraper {
  override nutrients(): Record<string, string> {
    const nutrition = this.schema.data.nutrition;
    const n = isObject(nutrition) ? nutrition : {};
    const keys = ["calories", "fatContent", "saturatedFatContent", "carbohydrateContent", "sugarContent", "sodiumContent", "fiberContent", "cholesterolContent"];
    const out: Record<string, string> = {};
    for (const key of keys) out[key] = this.fixComma(n[key]);
    return out;
  }

  private fixComma(value: unknown): string {
    if (typeof value === "string") return value.replaceAll(",", ".").trim();
    return value === undefined || value === null ? "" : String(value);
  }
}
