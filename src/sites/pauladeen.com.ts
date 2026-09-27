import { load } from "cheerio/slim";
import { Scraper } from "../scraper.ts";
import { SchemaOrg } from "../schemaorg.ts";
import { getText } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["pauladeen.com"];

/** The site's JSON-LD has a stray `;` before `</script>`, which fails JSON.parse; this fixes it before reading schema fields. */
export default class extends Scraper {
  private fixedSchemaCache?: SchemaOrg;

  private fixedSchema(): SchemaOrg {
    if (!this.fixedSchemaCache) {
      const fixedHtml = this.html.replace(/};\s*<\/script>/g, "}</script>");
      const $fixed = load(fixedHtml);
      this.fixedSchemaCache = new SchemaOrg($fixed, /^https?:\/\//.test(this.url) ? this.url : undefined);
    }
    return this.fixedSchemaCache;
  }

  override title(): string {
    return this.fixedSchema().title();
  }

  override author(): string | undefined {
    return this.fixedSchema().author();
  }

  override category(): string | undefined {
    return this.fixedSchema().category();
  }

  override totalTime(): number | undefined {
    return this.fixedSchema().totalTime();
  }

  override cookTime(): number | undefined {
    return this.fixedSchema().cookTime();
  }

  override prepTime(): number | undefined {
    return this.fixedSchema().prepTime();
  }

  override yields(): string | undefined {
    return this.fixedSchema().yields();
  }

  override ingredients(): string[] {
    return this.fixedSchema().ingredients();
  }

  override cuisine(): string | undefined {
    return this.fixedSchema().cuisine();
  }

  override keywords(): string[] | undefined {
    return this.fixedSchema().keywords();
  }

  override instructions(): string {
    const steps: string[] = [];
    for (const p of this.$("section.directions .directions__content p").toArray()) {
      const $p = this.$(p);
      if (getText($p, "", true)) steps.push(normalizeString(getText($p)));
    }
    return steps.join("\n");
  }
}
