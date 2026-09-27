import { describe, expect, it } from "vitest";
import { getMinutes, getYields, normalizeString } from "../src/utils.ts";
import { stripTags } from "../src/scraper.ts";

describe("getMinutes", () => {
  it.each([
    ["PT1H30M", 90],
    ["PT45M", 45],
    ["P0DT2H", 120],
    ["PT90S", 2],
    ["PT0M", undefined],
    ["1 hr 20 mins", 80],
    ["1½ hours", 90],
    ["1 1/2 hours", 90],
    ["12-15 minutes", 15],
    ["10 to 20 minutes", 20],
    ["2 days", 2880],
    ["45", 45],
    ["no time given", undefined],
  ])("%s → %s", (input, expected) => {
    expect(getMinutes(input)).toBe(expected);
  });

  it("truncates numbers like Python int()", () => {
    expect(getMinutes(15.7)).toBe(15);
  });

  it("rounds half to even like Python round()", () => {
    expect(getMinutes("2 min 30 secs")).toBe(2);
    expect(getMinutes("3 min 30 secs")).toBe(4);
  });

  it("ignores years and months of an ISO duration, like isodate", () => {
    expect(getMinutes("P1MT10M")).toBe(10);
  });

  it("rejects a missing value", () => {
    expect(() => getMinutes(undefined)).toThrow();
  });
});

describe("getYields", () => {
  it.each([
    ["4", "4 servings"],
    [4, "4 servings"],
    ["1", "1 serving"],
    ["Serves 4-6", "6 servings"],
    ["Makes 24 cookies", "24 cookies"],
    ["2 dozen", "2 dozen"],
    ["12 Tarts", "12 tarts"],
    ["makes 10", "10 items"],
    ["500 g", "500 grams"],
    ["1 hamburger bun", "1 hamburger bun"],
  ])("%s → %s", (input, expected) => {
    expect(getYields(input)).toBe(expected);
  });

  it("prefers the list element that names a unit", () => {
    expect(getYields(["12", "12 Tarts"])).toBe("12 tarts");
  });

  it("reads the first number of a QuantitativeValue object", () => {
    expect(getYields({ "@type": "QuantitativeValue", value: "6", unitText: "személyre" })).toBe("6 servings");
  });

  it("keeps word boundaries Unicode-aware", () => {
    expect(getYields("4 cupé")).toBe("4 servings");
  });
});

describe("normalizeString", () => {
  it("unescapes nested entities, drops tags and collapses whitespace", () => {
    expect(normalizeString("  Crème&amp;amp;brûlée <b>au</b>\n\tfour&nbsp;! ")).toBe("Crème&brûlée au four !");
  });

  it("collapses doubled parentheses only when both are present", () => {
    expect(normalizeString("sel ((fin))")).toBe("sel (fin)");
    expect(normalizeString("sel ((fin)")).toBe("sel ((fin)");
  });
});

describe("stripTags", () => {
  it("strips tags revealed by a first unescape", () => {
    expect(stripTags("Mix &amp;lt;b&amp;gt;well&amp;lt;/b&amp;gt;")).toBe("Mix well");
  });

  it("keeps a lone less-than sign", () => {
    expect(stripTags("bake < 30 min")).toBe("bake < 30 min");
  });
});
