import { describe, expect, it } from "vitest";
import { cases, compare } from "./parity.ts";

/** Fixtures where upstream's own output is an artifact we do not reproduce. */
const KNOWN: Record<string, { fields: string[]; why: string }> = {
  "aberlehome.com/aberlehome_2": { fields: ["total_time", "cook_time", "prep_time"], why: "upstream returns raw text ('27 minutes'); durations are minutes here" },
  "alittlebityummy.com/alittlebityummy_2": { fields: ["instructions_list"], why: "html.parser nests an unclosed <li> and duplicates its text as an extra step" },
};

const all = cases();

describe.skipIf(!all.length)("upstream fixtures of the index sites", () => {
  it.each(all.map((c) => [`${c.host}/${c.name}`, c] as const))("%s", (id, c) => {
    const known = KNOWN[id]?.fields ?? [];
    expect(compare(c).mismatches.filter((m) => !known.includes(m.field))).toEqual([]);
  });
});
