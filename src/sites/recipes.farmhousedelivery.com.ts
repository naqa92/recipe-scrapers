import type { AnyNode } from "domhandler";
import { isTag, isText } from "domhandler";
import { Scraper } from "../scraper.ts";
import { FieldMissing } from "../schemaorg.ts";
import { getText, selectOne } from "../helpers.ts";
import { normalizeString } from "../utils.ts";

export const hosts = ["recipes.farmhousedelivery.com"];

/** This site has two page layouts, so ingredients/instructions each try both marker patterns. */
export default class extends Scraper {
  /** bs4 `Tag.string`: recurses through single-child chains down to the one NavigableString, if any. */
  private tagString(el: AnyNode): string | undefined {
    if (!isTag(el) || el.children.length !== 1) return undefined;
    const only = el.children[0]!;
    if (isText(only)) return only.data;
    return this.tagString(only);
  }

  private findMarker(pattern: RegExp): AnyNode | undefined {
    for (const p of this.$("p").toArray()) {
      const s = this.tagString(p);
      if (s !== undefined && pattern.test(s)) return p;
    }
    return undefined;
  }

  private style1Ingredients(): string[] | undefined {
    const marker = this.findMarker(/Ingredients:/);
    if (!marker) return undefined;
    let node = marker.next;
    while (node) {
      if (isTag(node) && node.name === "ul") {
        return this.$(node)
          .find("li")
          .toArray()
          .map((li) => normalizeString(getText(this.$(li))));
      }
      node = node.next;
    }
    return undefined;
  }

  private style2Ingredients(): string[] | undefined {
    const marker = this.findMarker(/Ingredients/);
    if (!marker) return undefined;
    const out: string[] = [];
    let node = marker.next;
    while (node) {
      if (isTag(node) && node.name === "p") {
        const text = getText(this.$(node));
        if (text === "Instructions") break;
        out.push(normalizeString(text));
      }
      node = node.next;
    }
    return out;
  }

  override title(): string {
    const el = selectOne(this.$, "h1.entry-title");
    if (!el) throw new FieldMissing("title");
    return getText(el, "", true);
  }

  override totalTime(): number | undefined {
    return undefined;
  }

  override ingredients(): string[] {
    return this.style1Ingredients() ?? this.style2Ingredients() ?? [];
  }

  private style1Instructions(): string[] | undefined {
    const marker = this.findMarker(/Instructions:/);
    if (!marker) return undefined;
    let node = marker.next;
    while (node) {
      if (isTag(node) && node.name === "p" && getText(this.$(node), "", true) !== "") {
        return this.$(node)
          .find("span")
          .toArray()
          .map((s) => normalizeString(getText(this.$(s))));
      }
      node = node.next;
    }
    return undefined;
  }

  private style2Instructions(): string[] | undefined {
    const marker = this.findMarker(/Instructions/);
    if (!marker) return undefined;
    const out: string[] = [];
    let node = marker.next;
    while (node) {
      if (isTag(node) && node.name === "p" && getText(this.$(node), "", true) !== "") {
        out.push(normalizeString(getText(this.$(node))));
      }
      node = node.next;
    }
    return out;
  }

  override instructions(): string {
    const data = this.style1Instructions() ?? this.style2Instructions();
    return data && data.length ? data.join("\n") : "";
  }
}
