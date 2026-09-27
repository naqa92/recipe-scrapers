import { Scraper } from "../scraper.ts";

export const hosts = ["cookwell.com"];

const NUTRITION_PATTERN = /\{\\"calories\\":(?<calories>\d+),\\"carbohydrates\\":(?<carbohydrates>\d+),\\"fat\\":(?<fat>\d+),\\"protein\\":(?<protein>\d+)\}/;

export default class extends Scraper {
  override nutrients(): Record<string, string> {
    for (const script of this.$("script").toArray()) {
      const text = this.$(script).text();
      const match = NUTRITION_PATTERN.exec(text);
      if (match?.groups) {
        const g = match.groups;
        return {
          calories: g.calories!,
          carbohydrateContent: `${g.carbohydrates} g`,
          fatContent: `${g.fat} g`,
          proteinContent: `${g.protein} g`,
        };
      }
    }
    return this.schema.nutrients();
  }
}
