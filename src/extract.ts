// Port of the extruct subset recipe-scrapers uses: JSON-LD and W3C microdata, "uniform" output.
import type { CheerioAPI } from "cheerio/slim";
import type { AnyNode, Element } from "domhandler";
import { isComment, isTag, isText } from "domhandler";

export type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
export type JsonObject = { [k: string]: Json };

// ---------- JSON-LD ----------

/** Escapes raw control characters inside strings (Python json strict=False accepts them). */
function escapeControlCharsInStrings(src: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inString) {
      if (c === "\\") {
        out += c + (src[i + 1] ?? "");
        i++;
        continue;
      }
      if (c === '"') inString = false;
      const code = c.charCodeAt(0);
      out += code < 0x20 ? `\\u${code.toString(16).padStart(4, "0")}` : c;
    } else {
      if (c === '"') inString = true;
      out += c;
    }
  }
  return out;
}

/** jstyleson: drops // and /* *\/ comments and trailing commas outside strings. */
function stripJsonComments(src: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inString) {
      out += c;
      if (c === "\\") {
        out += src[i + 1] ?? "";
        i++;
      } else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 1;
    } else out += c;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

const HTML_OR_JS_COMMENTLINE = /^\s*(\/\/.*|<!--.*-->)/;

function parseJsonLd(script: string): Json {
  try {
    return JSON.parse(escapeControlCharsInStrings(script));
  } catch {
    return JSON.parse(escapeControlCharsInStrings(stripJsonComments(script.replace(HTML_OR_JS_COMMENTLINE, ""))));
  }
}

export function extractJsonLd($: CheerioAPI): Json[] {
  const items: Json[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let data: Json;
    try {
      data = parseJsonLd($(el).text());
    } catch {
      return; // extruct drops the whole syntax on one bad script; skipping only that script reads more pages
    }
    for (const item of Array.isArray(data) ? data : [data]) if (item) items.push(item);
  });
  return items;
}

// ---------- Microdata ----------

const REMOVED_TAGS = new Set(["script", "style", "link", "meta"]);
const NEWLINE_TAGS = new Set(["article", "aside", "br", "dd", "details", "div", "dt", "fieldset", "figcaption", "footer", "form", "header", "hr", "legend", "li", "main", "nav", "table", "tr"]);
const DOUBLE_NEWLINE_TAGS = new Set(["blockquote", "dl", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "ol", "p", "pre", "title", "ul"]);

/** html_text.etree_to_text on a node cleaned like extruct's microdata cleaner. */
export function layoutText(root: Element): string {
  const NL = Symbol("nl");
  const DNL = Symbol("dnl");
  const chunks: string[] = [];
  let prev: string | symbol = DNL;
  let pending = "";

  const addNewlines = (tag: string) => {
    if (prev === DNL) return;
    if (DOUBLE_NEWLINE_TAGS.has(tag)) {
      chunks.push(prev === NL ? "\n" : "\n\n");
      prev = DNL;
    } else if (NEWLINE_TAGS.has(tag)) {
      if (prev !== NL) chunks.push("\n");
      prev = NL;
    }
  };
  const flush = () => {
    const raw = pending;
    pending = "";
    const text = raw.trim().replace(/\s+/g, " ");
    if (!text) return;
    let space = " ";
    if (prev === NL || prev === DNL) space = "";
    else if (!(/\s$/.test(prev as string) || (!/^[,:;.!?")]/.test(text) && !/\($/.test(prev as string)))) space = "";
    chunks.push(space, text);
    prev = raw;
  };
  const walk = (node: AnyNode) => {
    if (isText(node)) pending += node.data;
    else if (isTag(node)) {
      if (REMOVED_TAGS.has(node.name)) return;
      flush();
      addNewlines(node.name);
      node.children.forEach(walk);
      flush();
      addNewlines(node.name);
    } else if (!isComment(node) && "children" in node) (node.children as AnyNode[]).forEach(walk);
  };
  flush();
  addNewlines(root.name);
  root.children.forEach(walk);
  flush();
  addNewlines(root.name);
  return chunks.join("").trim();
}

const stripHtml5Whitespace = (s: string) => s.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, "");

function joinUrl(base: string | undefined, href: string): string {
  if (!base) return href;
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

type Item = JsonObject;

class Microdata {
  private seen = new Set<Element>();
  private byId = new Map<string, Element>();

  constructor(private root: AnyNode, private baseUrl: string | undefined) {}

  extract(): Item[] {
    const scopes: Element[] = [];
    const visit = (n: AnyNode) => {
      if (isTag(n)) {
        if (n.attribs.itemscope !== undefined) scopes.push(n);
        const id = n.attribs.id;
        if (id !== undefined && !this.byId.has(id)) this.byId.set(id, n);
      }
      if ("children" in n) (n.children as AnyNode[]).forEach(visit);
    };
    visit(this.root);
    return scopes.map((s) => this.item(s)).filter((x): x is Item => x !== undefined);
  }

  private item(node: Element): Item | undefined {
    if (this.seen.has(node)) return undefined;
    this.seen.add(node);
    const item: Item = {};
    const types = (node.attribs.itemtype ?? "").split(/\s+/).filter(Boolean);
    if (types.length) {
      item.type = types.length === 1 ? types[0]! : types;
      const id = node.attribs.itemid;
      if (id) item.id = id.trim();
    }
    const props = new Map<string, Json[]>();
    const add = (pairs: [string, Json][]) => {
      for (const [k, v] of pairs) props.set(k, [...(props.get(k) ?? []), v]);
    };
    for (const p of this.propertyNodes(node)) add(this.property(p));
    for (const ref of (node.attribs.itemref ?? "").split(/\s+/).filter(Boolean)) add(this.refProperties(ref));
    if (props.size) {
      const out: JsonObject = {};
      for (const [k, vs] of props) out[k] = vs.length === 1 ? vs[0]! : vs;
      item.properties = out;
    } else {
      item.value = this.value(node, true);
    }
    return item;
  }

  /** `.//*[@itemprop]` minus props nested under a descendant itemscope, in document order. */
  private propertyNodes(node: Element): Element[] {
    const out: Element[] = [];
    const walk = (n: AnyNode) => {
      if (!isTag(n)) return;
      if (n.attribs.itemprop !== undefined) out.push(n);
      if (n.attribs.itemscope !== undefined) return;
      n.children.forEach(walk);
    };
    node.children.forEach(walk);
    return out;
  }

  private refProperties(refid: string): [string, Json][] {
    const ref = this.byId.get(refid);
    if (!ref) return [];
    if (ref.attribs.itemprop !== undefined && ref.attribs.itemscope !== undefined) return this.property(ref);
    const scopeOf = (n: Element, includeSelf: boolean): Element | null => {
      let cur: AnyNode | null = includeSelf ? n : n.parent;
      while (cur) {
        if (isTag(cur) && cur.attribs.itemscope !== undefined) return cur;
        cur = cur.parent;
      }
      return null;
    };
    const base = scopeOf(ref, true);
    const out: [string, Json][] = [];
    const walk = (n: AnyNode) => {
      if (!isTag(n)) return;
      if (n.attribs.itemprop !== undefined && scopeOf(n, false) === base) out.push(...this.property(n));
      n.children.forEach(walk);
    };
    walk(ref);
    return out;
  }

  private property(node: Element): [string, Json][] {
    const names = (node.attribs.itemprop ?? "").split(/\s+/).filter(Boolean);
    const value = this.value(node, false);
    return names.map((n) => [n, value]);
  }

  private value(node: Element, force: boolean): Json {
    const a = node.attribs;
    if (!force && a.itemscope !== undefined) return this.item(node) ?? null;
    const tag = node.name;
    if (tag === "meta") return a.content ?? "";
    if (["audio", "embed", "iframe", "img", "source", "track", "video"].includes(tag)) return joinUrl(this.baseUrl, stripHtml5Whitespace(a.src ?? ""));
    if (["a", "area", "link"].includes(tag)) return joinUrl(this.baseUrl, stripHtml5Whitespace(a.href ?? ""));
    if (tag === "object") return joinUrl(this.baseUrl, stripHtml5Whitespace(a.data ?? ""));
    if (tag === "data" || tag === "meter") return a.value ?? "";
    if (tag === "time") return a.datetime ?? "";
    if (a.content) return a.content;
    const itemprop = a.itemprop;
    if (itemprop && (itemprop.endsWith("-input") || itemprop.endsWith("-output"))) {
      const r: JsonObject = {};
      if (a.required !== undefined) r.valueRequired = true;
      if (a.name) r.valueName = a.name;
      return r;
    }
    return layoutText(node);
  }
}

function inferContext(typ: string, context = "http://schema.org"): [string, string] {
  let u: URL;
  try {
    u = new URL(typ);
  } catch {
    return [context, typ];
  }
  if (!u.host) return [context, typ];
  const base = `${u.protocol}//${u.host}`;
  const path = u.pathname === "/" && !typ.replace(/^[a-z]+:\/\/[^/]+/i, "").startsWith("/") ? "" : u.pathname;
  const fragment = u.hash.slice(1);
  if (path && fragment) return [new URL(path, base).href, fragment.replace(/^\/+|\/+$/g, "")];
  if (path) return [base, path.replace(/^\/+|\/+$/g, "")];
  return [context, typ];
}

function flatten(v: Json, ctx: string): Json {
  if (Array.isArray(v)) return v.map((o) => (o && typeof o === "object" && !Array.isArray(o) ? flattenDict(o, ctx, false) : o));
  if (v && typeof v === "object") return flattenDict(v, ctx, false);
  return v;
}

function flattenDict(d: JsonObject, ctx: string, addContext: boolean): JsonObject {
  const { type: typ, properties, ...rest } = d;
  if (!typ) return d;
  const out: JsonObject = { ...rest };
  let context = ctx;
  if (Array.isArray(typ)) out["@type"] = typ;
  else {
    const [c, t] = inferContext(String(typ), ctx);
    context = c;
    out["@type"] = t;
  }
  if (addContext) out["@context"] = context;
  for (const [k, v] of Object.entries((properties as JsonObject | undefined) ?? {})) out[k] = flatten(v, ctx);
  return out;
}

export function extractMicrodata($: CheerioAPI, baseUrl?: string): Json[] {
  return new Microdata($.root()[0]!, baseUrl).extract().map((i) => flattenDict(i, "http://schema.org", true));
}
