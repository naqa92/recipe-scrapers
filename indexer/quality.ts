// Pages a publisher did not mean to publish: they stay out of the index.

/** Draft markers a publisher leaves at the start of a title, in the MVP languages. */
const DRAFT_TITLE =
  /^\s*(?:\[\s*(?:test|draft|wip|brouillon|entwurf)\s*\]|\(\s*(?:test|draft|brouillon|entwurf)\s*\)|(?:niet gebruiken|do not use|don'?t use|nicht verwenden|nicht benutzen|ne pas utiliser|no usar|non usare|não usar|nie używać|kopie van|copy of|copie de)(?![\p{L}\p{N}]))/iu;

/** Hosts whose page data exposes the recipe's own publication flag first (HelloFresh's Next.js payload). */
const PUBLISH_FLAG_HOSTS = /(^|\.)hellofresh\.[a-z.]+$/;

export function unpublishedReason(html: string, title: string | undefined, url: string): "unpublished" | "draft_title" | undefined {
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    // not an absolute URL: no host-specific rule
  }
  if (PUBLISH_FLAG_HOSTS.test(host) && /"isPublished"\s*:\s*(true|false)/.exec(html)?.[1] === "false") return "unpublished";
  if (title && DRAFT_TITLE.test(title)) return "draft_title";
  return undefined;
}
