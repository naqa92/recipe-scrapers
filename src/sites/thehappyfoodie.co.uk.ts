import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["thehappyfoodie.co.uk"];

export default class extends Scraper {
  override ingredients(): string[] {
    const container = selectOne(this.$, "div.hf-ingredients__container");
    if (!container) throw new FieldMissing("ingredients");
    const out: string[] = [];
    for (const tr of container.find("tr").toArray()) {
      const $tr = this.$(tr);
      if ($tr.attr("class")) continue;
      const tds = $tr.find("td").toArray();
      const amount = tds[0] ? getText(this.$(tds[0])) : "";
      const name = tds[1] ? getText(this.$(tds[1])) : "";
      out.push(normalizeString(`${amount} ${name}`));
    }
    return out;
  }

  override ingredientGroups() {
    return this.groupBy(".heading th", ".hf-ingredients__single-group tr:not(.heading, .spacer)");
  }
}
