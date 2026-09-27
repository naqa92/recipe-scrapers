import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import type { IngredientGroup } from "../grouping.ts";

export const hosts = ["eggs.ca"];

export default class extends Scraper {
  override author(): string {
    return "Eggs.ca";
  }

  override ingredients(): string[] {
    return this.$(".ingredients__sections .ingredient, .ingredients__wrap--simple .ingredient")
      .toArray()
      .map((el) =>
        this.$(el)
          .find(".ingredient__amount, .ingredient__ingredient")
          .toArray()
          .map((part) => this.$(part).text().trim())
          .join(" "),
      );
  }

  override ingredientGroups(): IngredientGroup[] {
    const allIngredients = this.finalIngredients();
    const sections = this.$(".ingredients__sections .ingredients__section").toArray();
    if (sections.length) {
      return sections.map((section) => {
        const $section = this.$(section);
        const sectionIngredients = $section
          .find(".ingredient")
          .toArray()
          .map((el) =>
            this.$(el)
              .find(".ingredient__amount, .ingredient__ingredient")
              .toArray()
              .map((part) => this.$(part).text().trim())
              .join(" "),
          );
        const heading = $section.find(".ingredients__sectionHeading").first();
        if (!heading.length) throw new FieldMissing("ingredients section heading");
        return { ingredients: sectionIngredients, purpose: heading.text() };
      });
    }
    return [{ ingredients: allIngredients, purpose: null }];
  }
}
