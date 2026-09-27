import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["aberlehome.com"];

const NUTRIENT_MAP: Record<string, string> = {
  calories: ".mv-create-nutrition-calories",
  fatContent: ".mv-create-nutrition-total-fat",
  saturatedFatContent: ".mv-create-nutrition-saturated-fat",
  unsaturatedFatContent: ".mv-create-nutrition-unsaturated-fat",
  transFatContent: ".mv-create-nutrition-trans-fat",
  carbohydrateContent: ".mv-create-nutrition-carbohydrates",
  sugarContent: ".mv-create-nutrition-sugar",
  proteinContent: ".mv-create-nutrition-protein",
  sodiumContent: ".mv-create-nutrition-sodium",
  fiberContent: ".mv-create-nutrition-fiber",
  cholesterolContent: ".mv-create-nutrition-cholesterol",
};

export default class extends Scraper {
  override ingredients(): string[] {
    const ingredients = this.schema.ingredients();
    if (ingredients.length === 0) {
      return this.$(".mv-create-ingredients li")
        .toArray()
        .map((el) => normalizeString(getText(this.$(el))));
    }
    return ingredients;
  }

  override title(): string {
    try {
      return this.schema.title();
    } catch (e) {
      if (!(e instanceof FieldMissing)) throw e;
      const el = selectOne(this.$, ".entry-title");
      if (!el) throw new FieldMissing("title");
      return getText(el);
    }
  }

  override author(): string | undefined {
    const author = this.schema.author();
    if (author !== undefined) return author;
    return this.$('meta[name="author"]').first().attr("content");
  }

  override category(): string | undefined {
    const category = this.schema.category();
    if (category !== undefined) return category;
    const el = selectOne(this.$, ".mv-create-category");
    if (!el) throw new FieldMissing("category");
    const text = getText(el);
    return text.startsWith("Category: ") ? text.slice("Category: ".length) : text;
  }

  override yields(): string | undefined {
    try {
      return this.schema.yields();
    } catch (e) {
      if (!(e instanceof FieldMissing)) throw e;
      const el = selectOne(this.$, ".mv-create-time-yield .mv-create-time-format");
      if (!el) throw new FieldMissing("yields");
      return getText(el);
    }
  }

  override instructions(): string {
    const base = this.schema.instructions();
    if (base) return base;
    const li = this.$(".mv-create-instructions li").toArray();
    if (li.length) return li.map((el) => normalizeString(getText(this.$(el)))).join("\n");
    const p = this.$(".mv-create-instructions p").toArray();
    if (p.length) return p.map((el) => normalizeString(getText(this.$(el)))).join("\n");
    throw new FieldMissing("instructions");
  }

  override nutrients(): Record<string, string> {
    const nutrients = this.schema.nutrients();
    if (Object.keys(nutrients).length) return nutrients;
    const out: Record<string, string> = {};
    for (const [k, sel] of Object.entries(NUTRIENT_MAP)) {
      const item = selectOne(this.$, sel);
      if (!item) throw new FieldMissing(`nutrients: ${sel}`);
      selectOne(this.$, ".mv-create-nutrition-label", item)?.remove();
      out[k] = getText(item, "", true);
    }
    return out;
  }
}
