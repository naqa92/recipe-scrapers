import { Scraper } from "../scraper.ts";
import { getText, selectOne } from "../helpers.ts";
import { getYields, normalizeString } from "../utils.ts";
import { isTag, type AnyNode } from "domhandler";
import type { Element } from "domhandler";

export const hosts = ["mykitchen101.com"];

export default class extends Scraper {
  private findParagraphContaining(needle: string): AnyNode | undefined {
    return this.$("p")
      .toArray()
      .find((el) => getText(this.$(el)).includes(needle));
  }

  private findNextTag(from: AnyNode, tagName: string): Element | undefined {
    const all = this.$("*").toArray();
    const idx = all.indexOf(from);
    if (idx === -1) return undefined;
    for (let i = idx + 1; i < all.length; i++) {
      const n = all[i]!;
      if (isTag(n) && n.name === tagName) return n;
    }
    return undefined;
  }

  private findAllNextTags(from: AnyNode, tagName: string): Element[] {
    const all = this.$("*").toArray();
    const idx = all.indexOf(from);
    if (idx === -1) return [];
    return all.slice(idx + 1).filter((n): n is Element => isTag(n) && n.name === tagName);
  }

  override author(): string | undefined {
    const el = selectOne(this.$, 'a[rel="author"]');
    return el ? getText(el) : undefined;
  }

  override title(): string {
    return getText(this.$("h1.entry-title").first());
  }

  override yields(): string {
    const p = this.findParagraphContaining("分量：");
    return getYields(p ? getText(this.$(p)) : undefined);
  }

  override ingredients(): string[] {
    const p = this.findParagraphContaining("材料：");
    if (!p) return [];
    const ul = this.findNextTag(p, "ul");
    if (!ul) return [];
    return this.$(ul)
      .find("li")
      .toArray()
      .map((li) => normalizeString(getText(this.$(li))));
  }

  override instructions(): string {
    const p = this.findParagraphContaining("做法：");
    if (!p) return "";
    const lines: string[] = [];
    for (const el of this.findAllNextTags(p, "p")) {
      const raw = getText(this.$(el));
      if (/^\d/.test(raw)) lines.push(normalizeString(raw));
    }
    return lines.join("\n");
  }
}
