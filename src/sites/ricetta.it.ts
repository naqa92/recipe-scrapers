import { Scraper } from "../scraper.ts";

export const hosts = ["ricetta.it"];

export default class extends Scraper {
  override siteName(): string {
    return "Ricetta.it";
  }

  override instructions(): string {
    const instructionsList: string[] = [];
    let current = "";
    for (const sentence of this.schema.instructions().split(".")) {
      if (sentence.trim()) current += sentence + ".";
      if (sentence.includes("[") && sentence.includes("]")) {
        instructionsList.push(current.replace(/^ +/, ""));
        current = "";
      }
    }
    if (current) instructionsList.push(current.replace(/^ +/, ""));
    return instructionsList.join("\n");
  }
}
