// Parses an admin-pasted <head> snippet (Google Analytics, Tag Manager,
// Search Console verification, Meta Pixel, ...) into a small, explicit list
// of elements the root layout can render server-side. Deliberately a
// tag allow-list rather than "dump raw HTML": the snippet must land in the
// initial server HTML (Search Console verifies the raw <meta>), and React
// can't render an arbitrary HTML string into <head> — so each tag is
// re-emitted as a real React element. The same parser validates on save, so
// a snippet that can't render is rejected up front instead of silently
// disappearing from the site.

export type HeadAttrs = Record<string, string | true>;

export type HeadElement =
  | { tag: "meta" | "link"; attrs: HeadAttrs }
  | { tag: "script" | "style" | "noscript"; attrs: HeadAttrs; inline: string };

export type ParseHeadSnippetResult = { ok: true; elements: HeadElement[] } | { ok: false; error: string };

export const MAX_HEAD_SNIPPET_LENGTH = 20_000;

const VOID_TAGS = new Set(["meta", "link"]);
const RAW_TEXT_TAGS = new Set(["script", "style", "noscript"]);
const ALLOWED_TAGS = [...VOID_TAGS, ...RAW_TEXT_TAGS];
const BOOLEAN_ATTRS = new Set(["async", "defer", "nomodule"]);
const ATTR_NAME = /^[A-Za-z_:][-A-Za-z0-9_:.]*$/;
const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const REACT_PROP_NAMES: Record<string, string> = {
  class: "className",
  crossorigin: "crossOrigin",
  referrerpolicy: "referrerPolicy",
  charset: "charSet",
  "http-equiv": "httpEquiv",
  nomodule: "noModule",
  fetchpriority: "fetchPriority",
  hreflang: "hrefLang",
  imagesrcset: "imageSrcSet",
  imagesizes: "imageSizes",
};

function findTagEnd(src: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < src.length; i++) {
    const ch = src[i]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      return i;
    }
  }
  return -1;
}

function parseAttrs(raw: string, tag: string): { attrs: HeadAttrs } | { error: string } {
  const attrs: HeadAttrs = {};
  for (const match of raw.matchAll(ATTR_RE)) {
    const name = match[1]!.toLowerCase();
    if (!ATTR_NAME.test(name)) return { error: `Invalid attribute name "${name}" on <${tag}>.` };
    if (name.startsWith("on")) return { error: `Inline event handler "${name}" on <${tag}> isn't supported — put the code in a <script> instead.` };
    const value = match[2] ?? match[3] ?? match[4];
    attrs[name] = BOOLEAN_ATTRS.has(name) || value === undefined ? true : value;
  }
  return { attrs };
}

export function parseHeadSnippet(input: string): ParseHeadSnippetResult {
  const src = input.trim();
  const elements: HeadElement[] = [];
  let i = 0;

  while (i < src.length) {
    if (/\s/.test(src[i]!)) {
      i++;
      continue;
    }
    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      if (end === -1) return { ok: false, error: "Unclosed HTML comment (<!-- without -->)." };
      i = end + 3;
      continue;
    }

    const open = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(src.slice(i));
    if (!open) return { ok: false, error: `Only HTML tags are allowed — found "${src.slice(i, i + 30)}…" outside a tag.` };

    const tag = open[1]!.toLowerCase();
    if (!ALLOWED_TAGS.includes(tag)) {
      return { ok: false, error: `<${tag}> isn't allowed in the head. Allowed tags: ${ALLOWED_TAGS.map((t) => `<${t}>`).join(", ")}.` };
    }

    const attrStart = i + open[0].length;
    const tagEnd = findTagEnd(src, attrStart);
    if (tagEnd === -1) return { ok: false, error: `<${tag}> is missing its closing ">".` };

    const parsed = parseAttrs(src.slice(attrStart, tagEnd).replace(/\/\s*$/, ""), tag);
    if ("error" in parsed) return { ok: false, error: parsed.error };
    i = tagEnd + 1;

    if (VOID_TAGS.has(tag)) {
      elements.push({ tag: tag as "meta" | "link", attrs: parsed.attrs });
      continue;
    }

    const close = new RegExp(`</${tag}\\s*>`, "i").exec(src.slice(i));
    if (!close) return { ok: false, error: `<${tag}> is missing its closing </${tag}>.` };
    elements.push({ tag: tag as "script" | "style" | "noscript", attrs: parsed.attrs, inline: src.slice(i, i + close.index) });
    i += close.index + close[0].length;
  }

  return { ok: true, elements };
}

/** Converts parsed HTML attribute names to the prop names React expects. */
export function toReactProps(attrs: HeadAttrs): Record<string, string | true> {
  return Object.fromEntries(Object.entries(attrs).map(([name, value]) => [REACT_PROP_NAMES[name] ?? name, value]));
}

// The snippet is admin-trusted, but third-party scripts have no business on
// pages that hold sessions/PII beyond the public site: the admin panel and
// showroom dashboard, auth pages (password entry), and API/auth callbacks.
// Fails closed — an unknown/missing pathname injects nothing.
const EXCLUDED_PATH_PREFIXES = ["/admin", "/dashboard", "/api", "/auth", "/login", "/forgot-password", "/reset-password"];

export function shouldInjectHeadScripts(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return !EXCLUDED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
