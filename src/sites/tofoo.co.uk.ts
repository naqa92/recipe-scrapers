import { Scraper } from "../scraper.ts";
import { getMinutes } from "../utils.ts";

export const hosts = ["tofoo.co.uk"];

export default class extends Scraper {
  override author(): string {
    return "The Tofoo co.";
  }

  override title(): string {
    return this.$("div.hero__content").first().find("h1").first().text();
  }

  private findHeroStat(label: string): string | undefined {
    const heroStats = this.$("ul.hero__stats").first();
    if (!heroStats.length) return undefined;
    for (const li of heroStats.find("li").toArray()) {
      const text = this.$(li).text();
      if (new RegExp(`${label}:`).test(text)) return text;
    }
    return undefined;
  }

  /** Upstream returns a bare `int` here, unlike the "N servings" string every other site produces. */
  override yields(): string | undefined {
    const servesText = this.findHeroStat("Serves");
    if (servesText) {
      const match = /Serves:\s*(\d+)/.exec(servesText);
      if (match) return parseInt(match[1]!, 10) as unknown as string;
    }
    return undefined;
  }

  override prepTime(): number {
    const prepText = this.findHeroStat("Prep");
    return prepText ? (getMinutes(prepText) ?? 0) : 0;
  }

  override cookTime(): number {
    const cookText = this.findHeroStat("Cooking");
    return cookText ? (getMinutes(cookText) ?? 0) : 0;
  }

  override totalTime(): number {
    return this.prepTime() + this.cookTime();
  }

  override ingredients(): string[] {
    const div = this.$("div.recipe_details__ingredients").first();
    return div
      .find("li")
      .toArray()
      .map((li) => this.$(li).text());
  }

  override ingredientGroups() {
    return this.groupBy(".recipe_details__ingredient h5", ".recipe_details__ingredient li");
  }

  override instructions(): string {
    const div = this.$("div.recipe_details__steps").first();
    const ol = div.find("div.recipe_details__steps__ol").first().find("ol").first();
    return ol
      .find("li")
      .toArray()
      .map((li) => this.$(li).text())
      .join("\n");
  }

  override keywords(): string[] {
    const heroCats = this.$("ul.hero__cats").first();
    return heroCats.length
      ? heroCats
          .find("li")
          .toArray()
          .map((li) => this.$(li).text())
      : [];
  }
}
