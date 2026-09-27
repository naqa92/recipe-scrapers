import { Scraper } from "../scraper.ts";

export const hosts = ["receitasnestle.com.br"];

export default class extends Scraper {
  override totalTime(): number | undefined {
    let totalTime: number | undefined;
    try {
      totalTime = this.schema.totalTime();
    } catch {
      totalTime = undefined;
    }
    if (totalTime === undefined) {
      const timeDiv = this.$("div.recipeDetail__infoItem--time").first();
      if (timeDiv.length) {
        const timeStr = timeDiv.text().trim();
        const match = /\d+/.exec(timeStr);
        if (match) totalTime = parseInt(match[0], 10);
      }
    }
    return totalTime;
  }

  override instructions(): string {
    const stepsDiv = this.$("div.recipeDetail__steps").first();
    const instructions: string[] = [];
    if (stepsDiv.length) {
      for (const stepItem of stepsDiv.find("li").toArray()) {
        const divContent = this.$(stepItem).find("div").first();
        if (divContent.length) {
          const instruction = divContent.text().trim();
          instructions.push(instruction.replace(/^\d+\.\s*/, ""));
        }
      }
    }
    return instructions.join("\n");
  }
}
