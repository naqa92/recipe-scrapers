import { load } from "cheerio/slim";
import { Scraper } from "../scraper.ts";
import { getText } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["kingarthurbaking.com"];

export default class extends Scraper {
  /**
   * King Arthur wraps each instruction step in a <p> inside recipeInstructions; parse assuming
   * that, falling back to the raw schema instructions if it ever changes again.
   */
  override instructions(): string {
    const schemaInstructions = this.schema.instructions();
    const $$ = load(schemaInstructions);
    const steps = $$("p").toArray();
    if (steps.length) return steps.map((el) => normalizeString(getText($$(el)))).join("\n");
    return schemaInstructions;
  }
}
