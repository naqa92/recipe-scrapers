// BeautifulSoup equivalents for site overrides.
import type { Cheerio, CheerioAPI } from "cheerio/slim";
import type { AnyNode } from "domhandler";
import { isTag, isText } from "domhandler";

const SKIPPED = new Set(["script", "style", "template"]);

function strings(node: AnyNode, out: string[]) {
  if (isText(node)) out.push(node.data);
  else if (isTag(node)) {
    if (SKIPPED.has(node.name)) return;
    node.children.forEach((c) => strings(c, out));
  } else if ("children" in node) (node.children as AnyNode[]).forEach((c) => strings(c, out));
}

/**
 * bs4 `get_text(separator, strip)`: text nodes in document order, script/style/template excluded.
 * With strip=true, each string is stripped and empty ones dropped before joining.
 */
export function getText(el: Cheerio<AnyNode> | AnyNode | undefined, separator = "", strip = false): string {
  if (!el) return "";
  const nodes: AnyNode[] = "cheerio" in (el as object) ? (el as Cheerio<AnyNode>).toArray() : [el as AnyNode];
  const out: string[] = [];
  for (const n of nodes) strings(n, out);
  const parts = strip ? out.map((s) => s.trim()).filter(Boolean) : out;
  return parts.join(separator);
}

/** bs4 `find(...)` returning undefined instead of None; `select_one` equivalent. */
export function selectOne($: CheerioAPI, selector: string, root?: Cheerio<AnyNode>): Cheerio<AnyNode> | undefined {
  const found = root ? root.find(selector).first() : $(selector).first();
  return found.length ? found : undefined;
}
