import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["sunbasket.com"];

export default class extends Scraper {
  override siteName(): string | undefined {
    return this.author();
  }

  override instructions(): string {
    const container = this.$("div.instructions-container").first();
    const instructions = container.find("div.step").toArray();
    const list: string[] = [];
    for (const instruction of instructions) {
      const $instruction = this.$(instruction);
      const stepNumberTag = $instruction.find(".step-number").first();
      if (stepNumberTag.length) {
        const stepNumber = normalizeString(stepNumberTag.text());
        const stepName = normalizeString($instruction.find(".step-header").first().text());
        const stepInstructions = normalizeString($instruction.find(".instruction-description").first().text());
        list.push(`${stepNumber}: ${stepName} - ${stepInstructions}`);
      }
    }
    if (!list.length) throw new FieldMissing("instructions");
    return list.join("\n");
  }
}
