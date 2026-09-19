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
// Unquoted values run to the next whitespace or ">" — what browsers do.
const ATTR_RE = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

// Per-tag attribute allow-list (plus data-*/aria-* on any tag). Not just
// tidiness: these become React props, and a few attribute names crash React
// at render — `style="..."` (React wants an object), `children`, and
// `dangerouslySetInnerHTML` alongside inline content. The root layout renders
// this on every public page, so a snippet that saves must never be able to
// throw there; an allow-list makes "saves" imply "renders".
const ALLOWED_ATTRS: Record<string, readonly string[]> = {
  script: ["src", "type", "async", "defer", "nomodule", "nonce", "crossorigin", "integrity", "referrerpolicy", "fetchpriority", "id"],
  meta: ["name", "content", "property", "charset", "http-equiv", "itemprop", "media", "id"],
  link: ["rel", "href", "as", "type", "crossorigin", "hreflang", "media", "sizes", "integrity", "referrerpolicy", "fetchpriority", "id"],
  style: ["media", "nonce", "type", "id"],
  noscript: ["id"],
};
const DATA_ARIA_ATTR = /^(?:data|aria)-[a-z0-9_.:-]+$/;

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

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

// Attribute values in an HTML snippet are entity-encoded (`&amp;`), while
// React escapes on output — decode once here so `a&amp;b` doesn't come out
// double-encoded as `a&amp;amp;b`.
function decodeEntities(value: string): string {
  return value.replace(/&(?:#x([0-9a-f]+)|#(\d+)|([a-z]+));/gi, (whole, hex: string | undefined, dec: string | undefined, named: string | undefined) => {
    if (named) return NAMED_ENTITIES[named.toLowerCase()] ?? whole;
    const code = hex !== undefined ? parseInt(hex, 16) : parseInt(dec!, 10);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

function parseAttrs(raw: string, tag: string): { attrs: HeadAttrs } | { error: string } {
  const attrs: HeadAttrs = {};
  const allowed = ALLOWED_ATTRS[tag] ?? [];
  for (const match of raw.matchAll(ATTR_RE)) {
    const name = match[1]!.toLowerCase();
    if (name.startsWith("on")) return { error: `Inline event handler "${name}" on <${tag}> isn't supported — put the code in a <script> instead.` };
    if (!allowed.includes(name) && !DATA_ARIA_ATTR.test(name)) {
      return { error: `The "${name}" attribute isn't supported on <${tag}>. Supported: ${allowed.join(", ")}, data-*, aria-*.` };
    }
    const value = match[2] ?? match[3] ?? match[4];
    attrs[name] = BOOLEAN_ATTRS.has(name) || value === undefined ? true : decodeEntities(value);
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

    // A browser ends a raw-text element at "</tag" followed by whitespace,
    // "/" or ">" — NOT only at an exact "</tag>". Matching anything narrower
    // lets "</script x>" (or "</script/>") validate as script *content* while
    // the browser closes the script there and parses what follows as real
    // markup, bypassing the tag allow-list.
    const close = new RegExp(`</${tag}(?=[\\s/>])`, "i").exec(src.slice(i));
    if (!close) return { ok: false, error: `<${tag}> is missing its closing </${tag}>.` };
    const closeEnd = findTagEnd(src, i + close.index + close[0].length);
    if (closeEnd === -1) return { ok: false, error: `The closing </${tag}> is missing its ">".` };
    const inline = src.slice(i, i + close.index);
    // "<!--" inside script/style data can push the HTML parser into the
    // "script data double escaped" state, where the element stays open past
    // its </script> and swallows the rest of the page.
    if (tag !== "noscript" && inline.includes("<!--")) {
      return { ok: false, error: `<${tag}> content can't contain "<!--" — remove the HTML comment markers inside the ${tag}.` };
    }
    elements.push({ tag: tag as "script" | "style" | "noscript", attrs: parsed.attrs, inline });
    i = closeEnd + 1;
  }

  return { ok: true, elements };
}

/** Converts parsed HTML attribute names to the prop names React expects. */
export function toReactProps(attrs: HeadAttrs): Record<string, string | true> {
  return Object.fromEntries(Object.entries(attrs).map(([name, value]) => [Object.hasOwn(REACT_PROP_NAMES, name) ? REACT_PROP_NAMES[name]! : name, value]));
}

// The snippet is admin-trusted, but third-party scripts have no business on
// pages that hold sessions/PII beyond the public site: the admin panel,
// showroom dashboard and customer account area, pages with password/
// personal-detail entry (login, showroom registration, password reset), and
// API/auth callbacks. Fails closed — an unknown/missing pathname injects
// nothing. Note this is decided once per *document load* (a root layout isn't
// re-rendered on client-side navigation), so it governs where scripts are
// loaded on a fresh page load, not a hard guarantee across soft navigations.
const EXCLUDED_PATH_PREFIXES = ["/admin", "/dashboard", "/account", "/api", "/auth", "/login", "/register-showroom", "/forgot-password", "/reset-password"];

export function shouldInjectHeadScripts(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return !EXCLUDED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
