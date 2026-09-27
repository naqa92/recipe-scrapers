import { describe, expect, it } from "vitest";
import { detectLanguage } from "../indexer/language.ts";
import { unpublishedReason } from "../indexer/quality.ts";

const recipe = (title: string, ingredients: string[], instructions: string[]) => ({ title, ingredients, instructions });

describe("detectLanguage", () => {
  it("reads the language from the recipe text, not from a lying html lang", () => {
    const r = recipe("Kip-empanada met cheddar", ["200 g kipfilet", "1 ui", "100 g geraspte cheddar"], ["Snijd de ui fijn en bak de kip goudbruin.", "Vul het deeg en bak de empanada's 20 minuten in de oven."]);

    expect(detectLanguage(r, { declared: "fr-LU", site: "fr" })).toBe("nl");
  });

  it("detects Turkish on a WordPress page declared en-US", () => {
    const r = recipe("Fırında Karnıyarık", ["4 adet patlıcan", "250 gram kıyma", "1 adet soğan"], ["Patlıcanları alacalı soyun ve kızartın.", "Kıymayı soğanla kavurun, patlıcanların içine doldurup fırında pişirin."]);

    expect(detectLanguage(r, { declared: "en-US", site: "tr" })).toBe("tr");
  });

  it("keeps the site language between Danish and Norwegian, which trigrams confuse", () => {
    const r = recipe("Kyllingfilet med ris", ["2 kyllingfileter", "3 dl ris", "1 paprika"], ["Stek kyllingen i en panne.", "Kok risen og server med grønnsaker."]);

    expect(detectLanguage(r, { declared: "nb", site: "no" })).toBe("no");
    expect(detectLanguage(r, { declared: "da", site: "da" })).toBe("da");
  });

  it("maps Japanese and Chinese scripts", () => {
    expect(detectLanguage(recipe("肉じゃが", ["じゃがいも 3個", "牛肉 200g"], ["じゃがいもを切ります。", "鍋で煮ます。"]), { site: "ja" })).toBe("ja");
    expect(detectLanguage(recipe("紅燒牛肉麵", ["牛腱 600克", "麵條 300克"], ["牛肉切塊汆燙。", "加入醬油燉煮一小時。"]), { site: "zh-Hant" })).toBe("zh-Hant");
  });

  it("falls back to a non-English declared language, then to the site, when the text is too short", () => {
    const short = recipe("Pho", ["x"], ["y"]);

    expect(detectLanguage(short, { declared: "de-DE", site: "en" })).toBe("de");
    expect(detectLanguage(short, { declared: "en-US", site: "tr" })).toBe("tr");
  });
});

describe("unpublishedReason", () => {
  it("flags a HelloFresh recipe whose page data says it is not published", () => {
    const html = `<script id="__NEXT_DATA__">{"recipe":{"isPublished":false,"active":false},"related":[{"isPublished":true}]}</script>`;

    expect(unpublishedReason(html, "Kip-empanada", "https://www.hellofresh.lu/recipes/x")).toBe("unpublished");
  });

  it("keeps a published HelloFresh recipe", () => {
    const html = `<script id="__NEXT_DATA__">{"recipe":{"isPublished":true},"related":[{"isPublished":false}]}</script>`;

    expect(unpublishedReason(html, "Kip-empanada", "https://www.hellofresh.lu/recipes/x")).toBeUndefined();
  });

  it("does not read isPublished on sites whose page data is unknown", () => {
    expect(unpublishedReason(`{"isPublished":false}`, "Gratin", "https://www.example.fr/gratin")).toBeUndefined();
  });

  it.each(["Niet gebruiken - Kip-empanada", "NE PAS UTILISER Tarte", "Do not use: chili", "[TEST] Pancakes", "Kopie van Lasagne", "Nicht verwenden – Suppe"])("flags the draft title %s", (title) => {
    expect(unpublishedReason("", title, "https://www.example.com/r")).toBe("draft_title");
  });

  it.each(["Test Kitchen's Best Brownies", "Testaroli al pesto", "Copycat Olive Garden Soup"])("keeps the real title %s", (title) => {
    expect(unpublishedReason("", title, "https://www.example.com/r")).toBeUndefined();
  });
});

describe("terms guardrail", () => {
  it("finds the terms link in a footer and ignores other hosts", async () => {
    const { termsLinks } = await import("../indexer/terms.ts");
    const html = `<footer><a href="/about/termsandconditions">Terms and Conditions</a><a href="/mentions-legales">Mentions légales</a>
      <a href="https://other.example/terms">Partner terms</a><a href="/recipes">Recipes</a></footer>`;

    expect(termsLinks(html, "https://www.hellofresh.co.uk/")).toEqual([
      "https://www.hellofresh.co.uk/about/termsandconditions",
      "https://www.hellofresh.co.uk/mentions-legales",
    ]);
  });

  it("reports the HelloFresh UK scraping clause with its context", async () => {
    const { scanTerms } = await import("../indexer/terms.ts");
    const text = "21.6 You must not use any part of our Website (including its underlying code or structure) for data mining, scraping, framing, or reverse engineering, nor use our content in a way that may damage our reputation.";

    const f = scanTerms(text, "https://www.hellofresh.co.uk/about/termsandconditions");

    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ kind: "scraping" });
    expect(f[0]!.excerpt).toContain("for data mining, scraping, framing");
  });

  it("reports a commercial-use restriction in German", async () => {
    const { scanTerms } = await import("../indexer/terms.ts");

    expect(scanTerms("Die Inhalte dürfen nicht für gewerbliche Zwecke verwendet werden.", "x")[0]).toMatchObject({ kind: "commercial" });
  });
});
