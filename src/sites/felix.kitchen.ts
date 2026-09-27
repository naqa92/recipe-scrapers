import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["felix.kitchen"];

export default class extends Scraper {
  private stepDivs() {
    return this.$('div[class*="wp-block-columns is-layout-flex"]').toArray();
  }

  override author(): string | undefined {
    const el = this.$("span.author > a").first();
    return el.length ? getText(el) : undefined;
  }

  override title(): string {
    const content = this.$('meta[property="og:title"]').first().attr("content");
    if (content === undefined) throw new FieldMissing("title");
    return normalizeString(content);
  }

  override totalTime(): number | undefined {
    return undefined;
  }

  override yields(): string | undefined {
    const heading = selectOne(this.$, "p.ti");
    if (!heading) throw new FieldMissing("yields");
    const container = heading.nextAll("p").first();
    if (!container.length) throw new FieldMissing("yields");
    const strong = selectOne(this.$, "strong", container);
    if (!strong) throw new FieldMissing("yields");
    return getText(strong);
  }

  override ingredients(): string[] {
    const ingredients: string[] = [];
    for (const stepDiv of this.stepDivs()) {
      const ingredientsDiv = selectOne(this.$, "div", this.$(stepDiv));
      if (!ingredientsDiv) continue;
      for (const em of ingredientsDiv.find("em").toArray()) {
        const text = normalizeString(getText(this.$(em))).replace(/^[• ]+/, "");
        ingredients.push(...text.split("• "));
      }
    }
    return ingredients;
  }

  override instructions(): string {
    const lines: string[] = [];
    for (const stepDiv of this.stepDivs()) {
      const divs = this.$(stepDiv).find("div").toArray();
      const instructionsDiv = divs[1];
      if (!instructionsDiv) continue;
      for (const p of this.$(instructionsDiv).find("p").toArray()) {
        const $p = this.$(p);
        const mark = $p.children("mark").first();
        if (mark.length) mark.append(" ");
        $p.find("br").each((_, br) => {
          this.$(br).replaceWith("\n");
        });
        const text = getText($p);
        for (const line of text.split("\n")) lines.push(normalizeString(line));
      }
    }
    return lines.join("\n");
  }
}
