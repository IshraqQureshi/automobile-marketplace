import { describe, expect, it } from "vitest";
import { parseHeadSnippet, shouldInjectHeadScripts, toReactProps } from "./head-scripts";

const GA4 = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC123"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-ABC123');
</script>`;

describe("parseHeadSnippet", () => {
  it("parses a real Google Analytics 4 snippet (external + inline script, comment ignored)", () => {
    const result = parseHeadSnippet(GA4);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.elements).toHaveLength(2);
    expect(result.elements[0]).toEqual({
      tag: "script",
      attrs: { async: true, src: "https://www.googletagmanager.com/gtag/js?id=G-ABC123" },
      inline: "",
    });
    expect(result.elements[1]!.tag).toBe("script");
    expect((result.elements[1] as { inline: string }).inline).toContain("gtag('config', 'G-ABC123');");
  });

  it("parses Search Console verification meta tags (void tag, with and without self-closing slash)", () => {
    const result = parseHeadSnippet(`<meta name="google-site-verification" content="abc123" />\n<meta name='x' content=y>`);
    expect(result).toEqual({
      ok: true,
      elements: [
        { tag: "meta", attrs: { name: "google-site-verification", content: "abc123" } },
        { tag: "meta", attrs: { name: "x", content: "y" } },
      ],
    });
  });

  it("does not stop an inline script at a '>' inside a quoted attribute or string", () => {
    const result = parseHeadSnippet(`<script data-x="a>b">var s = "</div>";</script>`);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.elements[0] as { inline: string }).inline).toBe('var s = "</div>";');
  });

  it("parses GTM's head script and its noscript fallback", () => {
    const result = parseHeadSnippet(
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];})(window,document,'script','dataLayer','GTM-XXXX');</script><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXX"></iframe></noscript>`,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.elements.map((e) => e.tag)).toEqual(["script", "noscript"]);
  });

  it("returns no elements for an empty/whitespace snippet", () => {
    expect(parseHeadSnippet("  \n ")).toEqual({ ok: true, elements: [] });
  });

  it.each([
    ["a disallowed tag", `<iframe src="https://x"></iframe>`, "isn't allowed"],
    ["stray text", `hello <script></script>`, "Only HTML tags"],
    ["an unclosed script", `<script>alert(1)`, "missing its closing"],
    ["an unterminated tag", `<script src="x"`, `missing its closing ">"`],
    ["an unclosed comment", `<!-- oops <script></script>`, "Unclosed HTML comment"],
    ["an inline event handler", `<link rel="x" onload="alert(1)">`, "event handler"],
    ["a style attribute (crashes React at render)", `<meta style="color:red" name="x">`, `"style" attribute isn't supported`],
    ["a children attribute (crashes React at render)", `<script children="x">1</script>`, `"children" attribute isn't supported`],
    ["a dangerouslysetinnerhtml attribute", `<script dangerouslysetinnerhtml="x">1</script>`, "isn't supported"],
    ["an attribute not valid for the tag", `<meta src="x">`, `"src" attribute isn't supported on <meta>`],
    ["<!-- inside script data", `<script>var a='<!--<script>';</script>`, `can't contain "<!--"`],
    ["<!-- inside style data", `<style>/* <!-- */ a{}</style>`, `can't contain "<!--"`],
    ["a closing tag missing its >", `<script>1</script x`, `missing its ">"`],
  ])("rejects %s", (_label, input, message) => {
    const result = parseHeadSnippet(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });
});

describe("toReactProps", () => {
  it("maps HTML attribute names to React prop names and leaves the rest alone", () => {
    expect(toReactProps({ crossorigin: "anonymous", "http-equiv": "refresh", async: true, "data-id": "1", src: "x" })).toEqual({
      crossOrigin: "anonymous",
      httpEquiv: "refresh",
      async: true,
      "data-id": "1",
      src: "x",
    });
  });
});

describe("shouldInjectHeadScripts", () => {
  it.each(["/", "/listing", "/honda/accord-123", "/showrooms/abc", "/privacy", "/ready-to-sell"])("injects on the public page %s", (path) => {
    expect(shouldInjectHeadScripts(path)).toBe(true);
  });

  it.each([
    "/admin",
    "/admin/settings",
    "/dashboard",
    "/dashboard/vehicles/1/edit",
    "/account",
    "/account/favorites",
    "/login",
    "/register-showroom",
    "/forgot-password",
    "/reset-password",
    "/api/cron/x",
    "/auth/callback",
  ])(
    "does not inject on %s",
    (path) => {
      expect(shouldInjectHeadScripts(path)).toBe(false);
    },
  );

  it("fails closed when the pathname is unknown", () => {
    expect(shouldInjectHeadScripts(null)).toBe(false);
    expect(shouldInjectHeadScripts("")).toBe(false);
  });

  it("doesn't over-match a public path that merely starts with an excluded word", () => {
    expect(shouldInjectHeadScripts("/administration-costs")).toBe(true);
  });
});

describe("raw-text termination matches how browsers end the element", () => {
  // A browser closes <script> at "</script" followed by whitespace, "/" or
  // ">". These used to validate as one script whose *content* held markup,
  // which the browser then parsed as real elements in <head>.
  it.each([
    ["</script x>", `<script>a="</script x><h1>hi</h1>";</script>`],
    ["</script/>", `<script>a="</script/><iframe src=//e.x></iframe>";</script>`],
  ])("treats %s as the end of the script, so the trailing markup is validated (and rejected) rather than smuggled in as content", (_label, input) => {
    const result = parseHeadSnippet(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/isn't allowed|Only HTML tags|missing its closing/);
  });

  it("is case-insensitive for the closing tag", () => {
    expect(parseHeadSnippet(`<script>1</SCRIPT>`).ok).toBe(true);
  });

  it("does not end a script early on a tag that merely starts with the same letters", () => {
    const result = parseHeadSnippet(`<script>var s = "</scripts>";</script>`);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.elements[0] as { inline: string }).inline).toBe('var s = "</scripts>";');
  });
});

describe("attribute values", () => {
  it("decodes entities once so React's own escaping doesn't double-encode", () => {
    const result = parseHeadSnippet(`<meta name="x" content="a&amp;b &lt;c&gt; &quot;d&quot; &#39;e&#x27;">`);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.elements[0] as { attrs: Record<string, string> }).attrs.content).toBe(`a&b <c> "d" 'e'`);
  });

  it("reads unquoted values to the next whitespace like a browser (URLs with = and & stay whole)", () => {
    const result = parseHeadSnippet(`<script async src=https://example.com/a?id=G-1&l=2></script>`);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.elements[0] as { attrs: Record<string, unknown> }).attrs.src).toBe("https://example.com/a?id=G-1&l=2");
  });

  it("allows data-* and aria-* on any tag (Plausible/Umami-style data attributes)", () => {
    expect(parseHeadSnippet(`<script defer data-domain="harakagari.co.ke" src="https://plausible.io/js/script.js"></script>`).ok).toBe(true);
  });
});
