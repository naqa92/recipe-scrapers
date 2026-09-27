import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";
import { getYields, normalizeString } from "../utils.ts";

export const hosts = ["festligare.se"];

export default class extends Scraper {
  override category(): string | undefined {
    try {
      const c = this.schema.category();
      if (c) return c;
    } catch (e) {
      if (!(e instanceof FieldMissing)) throw e;
    }
    const breadcrumb = selectOne(this.$, '[itemtype="https://schema.org/BreadcrumbList"]');
    if (!breadcrumb) throw new FieldMissing("category");
    const items = breadcrumb.find('[itemtype="https://schema.org/ListItem"]').toArray();
    if (items.length > 1) return normalizeString(getText(this.$(items[items.length - 2]!)));
    return undefined;
  }

  override keywords(): string[] | undefined {
    try {
      const k = this.schema.keywords();
      if (k && k.length) return k;
    } catch (e) {
      if (!(e instanceof FieldMissing)) throw e;
    }
    const container = selectOne(this.$, ".ArticleContent-categories");
    if (!container) throw new FieldMissing("keywords");
    return container
      .find(".ArticleContent-categoryItem")
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))));
  }

  override yields(): string | undefined {
    try {
      return this.schema.yields();
    } catch (e) {
      if (!(e instanceof FieldMissing)) throw e;
    }
    const items = this.$(".Hero-detailsItem")
      .toArray()
      .filter((el) => {
        const title = selectOne(this.$, ".Hero-detailsItemTitle", this.$(el));
        return title && getText(title) === "Antal";
      });
    if (items.length) {
      const value = selectOne(this.$, ".Hero-detailsItemValue", this.$(items[0]!));
      if (value) return getYields(getText(value));
    }
    return undefined;
  }

  override ingredients(): string[] {
    try {
      const ing = this.schema.ingredients();
      if (ing && ing.length) return ing;
    } catch (e) {
      if (!(e instanceof FieldMissing)) throw e;
    }
    const container = selectOne(this.$, ".Recipe-ingredientsContent");
    if (!container) throw new FieldMissing("ingredients");
    return container
      .find('[itemprop="recipeIngredient"]')
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))));
  }

  override ingredientGroups() {
    return this.groupBy(".ArticleContent .Recipe-ingredientsContent h4", '.ArticleContent li[itemprop="recipeIngredient"]');
  }

  override instructions(): string {
    try {
      const ins = this.schema.instructions();
      if (ins) return ins;
    } catch (e) {
      if (!(e instanceof FieldMissing)) throw e;
    }
    const container = selectOne(this.$, '[itemprop="recipeInstructions"]');
    if (!container) throw new FieldMissing("instructions");
    return container
      .find('[itemtype="http://schema.org/HowToStep"]')
      .toArray()
      .map((el) => normalizeString(getText(this.$(el))))
      .join("\n");
  }
}
