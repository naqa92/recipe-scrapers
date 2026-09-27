import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";

export const hosts = ["valdemarsro.dk"];

export default class extends Scraper {
  override category(): string {
    const group = this.$("div.recipe-bar").first();
    if (!group.length) throw new FieldMissing("category");
    const categories = group
      .find("a")
      .toArray()
      .filter((a) => !(this.$(a).attr("href") ?? "").includes("/tag/"))
      .map((a) => this.$(a).text());
    return categories.join(",");
  }

  private getTime(label: string): number {
    const labelElement = this.$("span.recipe-stat-label")
      .toArray()
      .find((el) => this.$(el).text().includes(label));
    if (!labelElement) throw new FieldMissing(label);

    const timeText = this.$(labelElement).parent().find("strong").first().text();
    const match = /(?:(?<hours>\d+) timer?\s*)?(?:(?<minutes>\d+)\s*min.)?/.exec(timeText);
    const hours = match?.groups?.hours ? parseInt(match.groups.hours, 10) : 0;
    const minutes = (match?.groups?.minutes ? parseInt(match.groups.minutes, 10) : 0) + 60 * hours;

    if (minutes > 0) return minutes;
    throw new FieldMissing(label);
  }

  override totalTime(): number {
    return this.getTime("Tid i alt");
  }

  override cookTime(): number {
    return this.getTime("Arbejdstid");
  }

  override instructions(): string {
    const container = this.$('div[itemprop="recipeInstructions"]').first();
    if (!container.length) throw new FieldMissing("instructions");
    return container
      .find("p")
      .toArray()
      .map((tag) => this.$(tag).text())
      .join("\n");
  }
}
