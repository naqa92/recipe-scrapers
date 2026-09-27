import { describe, expect, it } from "vitest";
import { isComplete, readRecipe, scrapeHtml } from "../src/index.ts";

const page = (jsonld: string, body = "") => `<html lang="fr"><head><script type="application/ld+json">${jsonld}</script></head><body>${body}</body></html>`;

describe("JSON-LD reading", () => {
  it("reads a Recipe inside @graph with HowToSections", () => {
    const html = page(`{"@context":"https://schema.org","@graph":[
      {"@type":"WebSite","name":"Chez Léa"},
      {"@type":"Recipe","name":"Tarte aux pommes","author":{"@type":"Person","name":"Léa"},
       "recipeYield":"6","totalTime":"PT1H10M","recipeIngredient":["200 g de farine","3 pommes"],
       "recipeInstructions":[
         {"@type":"HowToSection","name":"Pâte","itemListElement":[{"@type":"HowToStep","text":"Mélanger la farine."}]},
         {"@type":"HowToSection","name":"Garniture","itemListElement":[{"@type":"HowToStep","text":"Couper les pommes."},{"@type":"HowToStep","text":"Cuire 40 min."}]}
       ]}]}`);

    const r = scrapeHtml(html, "https://chezlea.example/tarte");

    expect(r.title).toBe("Tarte aux pommes");
    expect(r.author).toBe("Léa");
    expect(r.siteName).toBe("Chez Léa");
    expect(r.language).toBe("fr");
    expect(r.yields).toBe("6 servings");
    expect(r.totalTime).toBe(70);
    expect(r.ingredients).toEqual(["200 g de farine", "3 pommes"]);
    expect(r.instructions).toEqual(["Pâte", "Mélanger la farine.", "Garniture", "Couper les pommes.", "Cuire 40 min."]);
    expect(r.instructionGroups).toEqual([
      { purpose: "Pâte", steps: ["Mélanger la farine."] },
      { purpose: "Garniture", steps: ["Couper les pommes.", "Cuire 40 min."] },
    ]);
    expect(isComplete(r)).toBe(true);
  });

  it("tolerates raw newlines in strings, comments and trailing commas", () => {
    const html = page(`// generated
{"@context":"https://schema.org","@type":"Recipe","name":"Soupe
froide", /* note */ "recipeIngredient":["1 concombre",],"recipeInstructions":"Mixer.",}`);

    const r = scrapeHtml(html, "https://x.example/soupe");

    expect(r.title).toBe("Soupe froide");
    expect(r.ingredients).toEqual(["1 concombre"]);
    expect(r.instructions).toEqual(["Mixer."]);
  });

  it("skips a broken script and still reads the next one", () => {
    const html = `<html><head><script type="application/ld+json">{broken</script>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Recipe","name":"Pesto","recipeIngredient":["basilic"],"recipeInstructions":["Piler."]}</script></head></html>`;

    expect(isComplete(scrapeHtml(html, "https://x.example/pesto"))).toBe(true);
  });

  it("reports a page without Recipe as incomplete, with the reason", () => {
    const r = scrapeHtml(page(`{"@context":"https://schema.org","@type":"Article","name":"10 astuces"}`), "https://x.example/a");

    expect(isComplete(r)).toBe(false);
    expect(r.errors.title).toMatch(/no Recipe schema/);
  });
});

describe("microdata reading", () => {
  it("reads itemprop values from meta, time, and text with layout", () => {
    const html = `<html lang="de"><body><div itemscope itemtype="http://schema.org/Recipe">
      <h1 itemprop="name">Kaiserschmarrn</h1>
      <meta itemprop="totalTime" content="PT25M">
      <ul><li itemprop="recipeIngredient">4 Eier</li><li itemprop="recipeIngredient">125 g Mehl</li></ul>
      <div itemprop="recipeInstructions"><p>Teig rühren.</p><p>In der Pfanne backen.</p></div>
    </div></body></html>`;

    const r = scrapeHtml(html, "https://y.example/kaiserschmarrn");

    expect(r.title).toBe("Kaiserschmarrn");
    expect(r.totalTime).toBe(25);
    expect(r.ingredients).toEqual(["4 Eier", "125 g Mehl"]);
    expect(r.instructions).toEqual(["Teig rühren.", "In der Pfanne backen."]);
  });
});

describe("readRecipe", () => {
  const respond = (body: Uint8Array | string, init: ResponseInit & { url?: string }) => (async () => {
    const res = new Response(body as BodyInit, init);
    Object.defineProperty(res, "url", { value: init.url ?? "https://z.example/r" });
    return res;
  }) as unknown as typeof fetch;

  it("decodes a Shift_JIS page from its meta charset", async () => {
    const title = "肉じゃが";
    const sjis = new Uint8Array([0x93, 0xf7, 0x82, 0xb6, 0x82, 0xe1, 0x82, 0xaa]);
    const head = new TextEncoder().encode(
      `<html lang="ja"><head><meta charset="Shift_JIS"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Recipe","name":"`,
    );
    const tail = new TextEncoder().encode(`","recipeIngredient":["x"],"recipeInstructions":["y"]}</script></head></html>`);
    const body = new Uint8Array([...head, ...sjis, ...tail]);

    const r = await readRecipe("https://z.example/r", { fetch: respond(body, { status: 200, headers: { "content-type": "text/html" } }) });

    expect(r.charset).toBe("shift_jis");
    expect(r.recipe?.title).toBe(title);
    expect(r.complete).toBe(true);
  });

  it("returns the refusal status without reading", async () => {
    const r = await readRecipe("https://z.example/r", { fetch: respond("denied", { status: 403 }) });

    expect(r).toMatchObject({ status: 403, complete: false });
    expect(r.recipe).toBeUndefined();
  });

  it("never throws on a network error", async () => {
    const failing = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;

    const r = await readRecipe("https://z.example/r", { fetch: failing });

    expect(r).toMatchObject({ complete: false, error: "TypeError: fetch failed" });
  });
});

describe("fallbacks", () => {
  it("finds a microdata Recipe nested as a property of a WebPage", () => {
    const html = `<html lang="nb"><body itemscope itemtype="http://schema.org/WebPage">
      <div itemprop="itemReviewed" itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Italiensk laks</h1>
        <span itemprop="recipeIngredient">400 g laks</span>
        <p itemprop="recipeInstructions">Stek laksen.</p>
      </div></body></html>`;

    const r = scrapeHtml(html, "https://www.rema.no/oppskrifter/fisk/italiensk-laks/");

    expect(r.title).toBe("Italiensk laks");
    expect(isComplete(r)).toBe(true);
  });

  it("finds a JSON-LD Recipe nested under an Article", () => {
    const html = page(`{"@context":"https://schema.org","@type":"Article","name":"Notre sélection",
      "about":{"@type":"Recipe","name":"Gratin","recipeIngredient":["1 kg de pommes de terre"],"recipeInstructions":["Cuire."]}}`);

    expect(scrapeHtml(html, "https://x.example/gratin").title).toBe("Gratin");
  });

  it("falls back to schema.org when a site override no longer reads the page", () => {
    // mindmegette.hu reads title, ingredients and steps from its HTML; none of its selectors is on this page.
    const html = page(`{"@context":"https://schema.org","@type":"Recipe","name":"Rakott krumpli","recipeIngredient":["1 kg burgonya"],"recipeInstructions":["Megfőzzük a burgonyát."]}`);

    const r = scrapeHtml(html, "https://www.mindmegette.hu/rakott-krumpli.recept/");

    expect(isComplete(r)).toBe(true);
  });
});
