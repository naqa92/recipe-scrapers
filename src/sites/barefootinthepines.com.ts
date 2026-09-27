import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText } from "../helpers.ts";

export const hosts = ["barefootinthepines.com"];

const LABELS: Record<string, string> = {
  calories: "calories",
  carbohydrates: "carbohydrateContent",
  cholesterol: "cholesterolContent",
  "total fat": "fatContent",
  fiber: "fiberContent",
  protein: "proteinContent",
  "saturated fat": "saturatedFatContent",
  "serving size": "servingSize",
  sodium: "sodiumContent",
  sugar: "sugarContent",
  "trans fat": "transFatContent",
  "unsaturated fat": "unsaturatedFatContent",
};

export default class extends Scraper {
  override ingredientGroups() {
    return this.groupBy(".mv-create-ingredients h4", ".mv-create-ingredients ul li");
  }

  override nutrients(): Record<string, string> {
    const section = this.$(".mv-create-nutrition-box").first();
    if (!section.length) throw new FieldMissing("nutrients");
    const out: Record<string, string> = {};
    section.find(".mv-create-nutrition-item").each((_, itemEl) => {
      const item = this.$(itemEl);
      const label = item.find(".mv-create-nutrition-label").first();
      if (!label.length) return;
      const labelText = getText(label, "", true);
      const key = labelText.toLowerCase().replace(/:+$/, "");
      const mapped = LABELS[key];
      if (!mapped) return;
      out[mapped] = getText(item, "", true).split(labelText).join("").trim();
    });
    return out;
  }
}
