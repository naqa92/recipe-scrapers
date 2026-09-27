import { Scraper } from "../scraper.ts";
import { getMinutes, getYields, normalizeString } from "../utils.ts";

export const hosts = ["30seconds.com"];

type Article = { name?: string; headline?: string; author?: unknown; image?: unknown };

const DIRECTIONS_RE = /(?:Here.{0,4}s how to make it|Directions|Instructions|Method|Steps)\b.*?<ol>(.*?)<\/ol>/is;

export default class extends Scraper {
  private articleCache?: Article;

  private article(): Article {
    if (this.articleCache) return this.articleCache;
    let node: Article = {};
    const re = /<script[^>]+type=['"]application\/ld\+json['"][^>]*>([\s\S]*?)<\/script>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(this.html))) {
      let obj: unknown;
      try {
        obj = JSON.parse(m[1]!);
      } catch {
        continue;
      }
      const candidates = Array.isArray(obj) ? obj : [obj];
      for (const c of candidates) {
        if (c && typeof c === "object" && !Array.isArray(c) && ((c as Article).name || (c as Article).headline)) {
          node = c as Article;
          break;
        }
      }
      if (Object.keys(node).length) break;
    }
    this.articleCache = node;
    return node;
  }

  private directionsOl(): { index: number; content: string } | undefined {
    const m = DIRECTIONS_RE.exec(this.html);
    return m ? { index: m.index, content: m[1]! } : undefined;
  }

  override author(): string | undefined {
    let author = this.article().author;
    if (Array.isArray(author)) author = author.length ? author[0] : undefined;
    if (author && typeof author === "object") return (author as { name?: string }).name;
    return author as string | undefined;
  }

  override title(): string {
    const a = this.article();
    return normalizeString(a.name || a.headline || "");
  }

  override totalTime(): number | undefined {
    const match = /Total Time:\s*([^<\n]+)/i.exec(this.html);
    return match ? getMinutes(match[1]) : 0;
  }

  override yields(): string | undefined {
    const match = /Servings:\s*([0-9]+)/i.exec(this.html);
    return match ? getYields(`${match[1]} servings`) : undefined;
  }

  override ingredients(): string[] {
    const start = /<strong>\s*Ingredients\s*<\/strong>/i.exec(this.html) ?? /Servings:.*?<\/p>/is.exec(this.html);
    if (!start) return [];
    const directions = this.directionsOl();
    let end = directions ? directions.index : this.html.length;
    const ordered = this.html.indexOf("<ol", start.index + start[0].length);
    if (ordered !== -1) end = Math.min(end, ordered);
    const items = [...this.html.slice(start.index + start[0].length, end).matchAll(/<li>(.*?)<\/li>/gs)].map((m) => m[1]!);
    return items.map((i) => normalizeString(i)).filter(Boolean);
  }

  override instructions(): string {
    const directions = this.directionsOl();
    if (!directions) return "";
    const items = [...directions.content.matchAll(/<li>(.*?)<\/li>/gs)].map((m) => m[1]!);
    return items
      .map((i) => normalizeString(i))
      .filter(Boolean)
      .join("\n");
  }
}
