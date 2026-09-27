// Port of recipe_scrapers/plugins/best_image.py: largest non-junk image among primary, schema and meta candidates.
import type { CheerioAPI } from "cheerio/slim";
import type { Json } from "./extract.ts";

type Candidate = { url: string; width?: number; height?: number; sources: Set<string>; order: number };
type Entry = { url: unknown; width?: unknown; height?: unknown };

const DIMENSION = /(?:^|[^0-9])(?<width>\d{3,5})[xX](?<height>\d{3,5})(?:[^0-9]|$)/;
const QUERY_WIDTH = /[?&](?:w|width)=(\d{3,5})/i;
const QUERY_HEIGHT = /[?&](?:h|height)=(\d{3,5})/i;
const JUNK = /(?:^|[/.-])(?:favicon|apple-touch-icon|icon(?:[.-][\w-]+)?|logo)(?:[/.?-]|$)/i;
const IMAGE_META = new Set(["og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src"]);
const PRIORITY: Record<string, number> = { primary: 3, schema: 2, opengraph: 1, twitter: 1 };

export function parseDimension(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Math.trunc(value);
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const m = /\d+/.exec(value);
    return m ? parseInt(m[0], 10) : undefined;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    for (const k of ["value", "maxValue", "minValue"]) {
      if (k in value) {
        const p = parseDimension((value as Record<string, unknown>)[k]);
        if (p !== undefined) return p;
      }
    }
  }
  return undefined;
}

function resolveBase(url: string): string {
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("//")) return "https:" + u;
  if (!u.startsWith("http://") && !u.startsWith("https://")) return "http://" + u.replace(/^\/+/, "");
  return u;
}

function normalizeUrl(url: unknown, base: string): string | undefined {
  if (url === null || url === undefined) return undefined;
  let u = String(url).trim();
  if (!u || u.startsWith("data:")) return undefined;
  if (u.startsWith("//")) u = "https:" + u;
  else if (!u.startsWith("http://") && !u.startsWith("https://")) {
    const b = resolveBase(base);
    if (b) {
      try {
        u = new URL(u, b).href;
      } catch {
        return undefined;
      }
    }
  }
  try {
    const p = new URL(u);
    if ((p.protocol !== "http:" && p.protocol !== "https:") || !p.host) return undefined;
  } catch {
    return undefined;
  }
  return u;
}

function* normalizeEntries(entry: unknown): Generator<Entry> {
  if (!entry) return;
  if (Array.isArray(entry)) {
    for (const i of entry) yield* normalizeEntries(i);
    return;
  }
  if (typeof entry === "object") {
    const e = entry as Record<string, unknown>;
    let url = e.url || e["@id"] || e.contentUrl;
    if (Array.isArray(url)) url = url[0];
    if (!url) return;
    yield {
      url: String(url).trim(),
      width: parseDimension(e.width || e.pixelWidth || e.contentWidth),
      height: parseDimension(e.height || e.pixelHeight || e.contentHeight),
    };
    return;
  }
  if (typeof entry === "string") {
    const u = entry.trim();
    if (u) yield { url: u };
  }
}

const maxDim = (a?: number, b?: number) => (a === undefined ? b : b === undefined ? a : Math.max(a, b));

function merge(cands: Map<string, Candidate>, c: Entry | undefined, source: string, base: string) {
  if (!c) return;
  const url = normalizeUrl(c.url, base);
  if (!url) return;
  const width = parseDimension(c.width);
  const height = parseDimension(c.height);
  const existing = cands.get(url);
  if (!existing) {
    cands.set(url, { url, width, height, sources: new Set([source]), order: cands.size });
    return;
  }
  if (width !== undefined) existing.width = maxDim(existing.width, width);
  if (height !== undefined) existing.height = maxDim(existing.height, height);
  existing.sources.add(source);
}

function dimsFromUrl(url: string): [number, number] | undefined {
  const m = DIMENSION.exec(url);
  if (m?.groups) return [parseInt(m.groups.width!, 10), parseInt(m.groups.height!, 10)];
  const w = QUERY_WIDTH.exec(url);
  const h = QUERY_HEIGHT.exec(url);
  if (w && h) return [parseInt(w[1]!, 10), parseInt(h[1]!, 10)];
  return undefined;
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function score(c: Candidate): number[] {
  if (JUNK.test(pathOf(c.url))) return [-1, 0, 0, c.order];
  let { width, height } = c;
  if (!(width && height)) {
    const d = dimsFromUrl(c.url);
    if (d) {
      width = width || d[0];
      height = height || d[1];
    }
  }
  let area = 0;
  if (width && height) area = width * height;
  else if (width || height) area = (width || height)! ** 2;
  const priority = Math.max(0, ...[...c.sources].map((s) => PRIORITY[s] ?? 0));
  return [area, priority, c.url.startsWith("https://") ? 1 : 0, -c.order];
}

const greater = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! > b[i]!;
  return false;
};

export function bestImage(image: string | undefined, schemaImage: Json | undefined, $: CheerioAPI, pageUrl: string): string | undefined {
  const cands = new Map<string, Candidate>();
  const base = resolveBase(pageUrl);
  for (const e of normalizeEntries(image)) merge(cands, e, "primary", base);
  for (const e of normalizeEntries(schemaImage)) merge(cands, e, "schema", base);

  const images = new Map<string, Entry>();
  let current: string | undefined;
  $("meta").each((_, el) => {
    const a = (el as { attribs: Record<string, string> }).attribs;
    const prop = (a.property || a.name || "").toLowerCase();
    const content = a.content;
    if (!content) return;
    if (IMAGE_META.has(prop)) {
      const url = content.trim();
      current = url;
      if (!images.has(url)) images.set(url, { url });
      merge(cands, images.get(url), prop.startsWith("twitter:") ? "twitter" : "opengraph", base);
    } else if ((prop === "og:image:width" || prop === "og:image:height") && current !== undefined && images.has(current)) {
      const e = images.get(current)!;
      if (prop === "og:image:width") e.width = parseDimension(content);
      else e.height = parseDimension(content);
      merge(cands, e, "opengraph", base);
    }
  });

  if (!cands.size) return image;
  let best: Candidate | undefined;
  let bestScore = [-1, -1, -1, 0];
  for (const c of cands.values()) {
    const s = score(c);
    if (greater(s, bestScore)) {
      best = c;
      bestScore = s;
    }
  }
  return best?.url ?? image;
}
