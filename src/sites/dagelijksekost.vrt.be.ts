import { Scraper } from "../scraper.ts";

export const hosts = ["dagelijksekost.vrt.be"];

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

/** Python `bytes.decode("unicode_escape")` on an all-ASCII source: interprets backslash escapes literally present in the text. */
function unicodeEscapeDecode(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|\\(.)/g, (_m, u: string, x: string, c: string) => {
    if (u) return String.fromCharCode(parseInt(u, 16));
    if (x) return String.fromCharCode(parseInt(x, 16));
    switch (c) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      case "b":
        return "\b";
      case "f":
        return "\f";
      default:
        return c;
    }
  });
}

function findJson(blocks: string[]): JsonValue[] {
  const res: JsonValue[] = [];
  for (const block of blocks) {
    if (!block || !block.includes("self.__next_f.push")) continue;
    const startIdx = block.indexOf(":[");
    const endIdx = block.lastIndexOf('"');
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) continue;
    const jsonContent = block.slice(startIdx + 1, endIdx);
    try {
      const unescaped = unicodeEscapeDecode(jsonContent);
      const parsed = JSON.parse(unescaped) as JsonValue;
      if (Array.isArray(parsed)) res.push(...parsed);
    } catch {
      continue;
    }
  }
  return res;
}

function isObject(v: JsonValue): v is { [k: string]: JsonValue } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function findInstructions(data: JsonValue): JsonValue[] {
  const results: JsonValue[] = [];
  if (isObject(data)) {
    for (const [key, value] of Object.entries(data)) {
      if (key === "instructions") results.push(value);
      else if (isObject(value) || Array.isArray(value)) results.push(...findInstructions(value));
    }
  } else if (Array.isArray(data)) {
    for (const item of data) {
      if (isObject(item) || Array.isArray(item)) results.push(...findInstructions(item));
    }
  }
  return results;
}

function parseInstructions(instructions: JsonValue): string | undefined {
  if (!isObject(instructions)) return undefined;
  const keys = Object.keys(instructions);
  if (!keys.every((k) => /^-?\d+$/.test(k))) return undefined;
  const sorted = keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const parts: string[] = [];
  for (const k of sorted) {
    const v = instructions[k];
    if (typeof v !== "string") return undefined;
    parts.push(v);
  }
  return parts.join("\n");
}

export default class extends Scraper {
  override canonicalUrl(): string {
    const id = this.schema.data["@id"];
    if (typeof id === "string" && id.startsWith("http")) return id;
    return this.url;
  }

  override instructions(): string {
    const scriptBlocks = this.$("script")
      .toArray()
      .map((s) => this.$(s).text());
    const recipeJson = findJson(scriptBlocks);
    const instructionCandidates = recipeJson.flatMap((item) => findInstructions(item));

    const shortInstructions = this.schema.instructions();
    const firstInstruction = shortInstructions.split("\n")[0] ?? "";
    if (!firstInstruction) return shortInstructions;

    const dist = Math.min(3, Math.floor(firstInstruction.length / 5));

    for (const instructions of instructionCandidates) {
      if (!isObject(instructions) || !("0" in instructions)) continue;
      const zero = instructions["0"];
      if (typeof zero !== "string") continue;
      if (levenshteinDistance(firstInstruction, zero) > dist) continue;

      const parsed = parseInstructions(instructions);
      if (!parsed) continue;
      return parsed;
    }

    return shortInstructions;
  }
}
